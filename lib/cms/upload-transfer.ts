import {z} from 'zod';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const transferSchema=z.object({id:uuid,site:uuid,key:z.string(),mime:z.enum(['image/jpeg','image/png','image/webp','image/avif']),bytes:z.number().int().min(1).max(25_000_000)}).strict();
type Transfer=z.infer<typeof transferSchema>;
type Adapter={authorize:(token:string,site:string,id:string)=>Promise<unknown>;put:(token:string,transfer:Transfer,bytes:Uint8Array)=>Promise<void>};
export async function putPrivateUpload(config:{url:string;key:string},token:string,transfer:Transfer,bytes:Uint8Array,fetcher:typeof fetch=fetch){
 let base:URL;try{base=new URL(config.url);}catch{throw new CmsGatewayError(503,'CMS storage is not configured.');}
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.key)throw new CmsGatewayError(503,'CMS storage is not configured.');
 if(transfer.key!==`${transfer.site}/${transfer.id}/original`)throw new CmsGatewayError(503,'Invalid upload destination.');
 let response:Response;
 try{response=await fetcher(new URL(`/storage/v1/object/cms-originals/${transfer.key}`,base),{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':transfer.mime,'x-upsert':'false'},body:bytes as BodyInit,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});}
 catch{throw new CmsGatewayError(503,'Transfer could not be confirmed. Check upload status before retrying.');}
 if(response.ok)return;
 let code='';try{code=(await response.json()).code;}catch{/* Never expose provider diagnostics. */}
 if(response.status===409||code==='Duplicate')throw new CmsGatewayError(409,'This reservation already contains a file. Check its processing status; it will not be overwritten.');
 throw new CmsGatewayError(response.status===401?401:response.status===403?403:503,'The private file transfer was not accepted.');
}
const adapter:Adapter={authorize:(token,site,id)=>cmsRpc(cmsConnection(),token,'get_upload_transfer',{p_site:site,p_upload:id}),put:(token,transfer,bytes)=>putPrivateUpload(cmsConnection(),token,transfer,bytes)};
export async function handleUploadTransfer(request:Request,backend:Adapter=adapter){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const site=uuid.safeParse(request.headers.get('x-cms-site')),id=uuid.safeParse(request.headers.get('x-cms-upload'));
  if(!site.success||!id.success)throw new CmsGatewayError(400,'Select a valid upload reservation.');
  const parsed=transferSchema.safeParse(await backend.authorize(token,site.data,id.data));
  if(!parsed.success)throw new CmsGatewayError(404,'Upload reservation is unavailable or expired.');
  const transfer=parsed.data;
  if(transfer.id!==id.data||transfer.site!==site.data||transfer.key!==`${site.data}/${id.data}/original`)throw new CmsGatewayError(503,'Invalid upload destination.');
  if(request.headers.get('content-type')?.split(';')[0].trim()!==transfer.mime)throw new CmsGatewayError(415,'The image type does not match the reservation.');
  const declared=request.headers.get('content-length');if(declared!==null&&Number(declared)!==transfer.bytes)throw new CmsGatewayError(413,'The file size does not match the reservation.');
  const reader=request.body?.getReader();if(!reader)throw new CmsGatewayError(400,'Upload bytes are missing.');
  const chunks:Uint8Array[]=[];let length=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>transfer.bytes){await reader.cancel();throw new CmsGatewayError(413,'The file exceeds its reserved size.');}chunks.push(value);}}finally{reader.releaseLock();}
  if(length!==transfer.bytes)throw new CmsGatewayError(422,'The transfer is incomplete.');
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  await backend.put(token,transfer,bytes);
  return Response.json({result:{id:transfer.id,status:'awaiting_verification'}},{status:202,headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
