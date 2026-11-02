import {createHash} from 'node:crypto';
import {z} from 'zod';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),query=z.object({site:uuid,record:uuid,revision:uuid,asset:uuid}).strict();
const descriptor=query.omit({asset:true}).extend({id:uuid,key:z.string(),bytes:z.number().int().min(1).max(25000000),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
type Descriptor=z.infer<typeof descriptor>;type Identity=z.infer<typeof query>;
type Adapter={authorize:(token:string,identity:Identity)=>Promise<unknown>;read:(token:string,file:Descriptor)=>Promise<Response>};
export async function readPrivateDocument(config:{url:string;key:string},token:string,input:Descriptor,fetcher:typeof fetch=fetch){
 let base:URL;try{base=new URL(config.url);}catch{throw new CmsGatewayError(503,'CMS storage is not configured.');}
 const parsed=descriptor.safeParse(input);
 if(!parsed.success||parsed.data.key!==`${parsed.data.site}/${parsed.data.id}/delivery.pdf`||base.protocol!=='https:'||base.pathname!=='/'||base.username||base.password||base.search||base.hash||!config.key)throw new CmsGatewayError(503,'Document preview is unavailable.');
 try{return await fetcher(new URL(`/storage/v1/object/authenticated/cms-document-media/${parsed.data.key}`,base),{headers:{apikey:config.key,Authorization:`Bearer ${token}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw new CmsGatewayError(503,'Document preview is temporarily unavailable.');}
}
const adapter:Adapter={authorize:(token,q)=>cmsRpc(cmsConnection(),token,'get_document_preview',{p_site:q.site,p_record:q.record,p_revision:q.revision,p_asset:q.asset}),read:(token,file)=>readPrivateDocument(cmsConnection(),token,file)};
export async function handleDocumentPreview(request:Request,backend:Adapter=adapter){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  const parsedQuery=query.safeParse(Object.fromEntries(params));if(!parsedQuery.success||Array.from(params).length!==4)throw new CmsGatewayError(400,'Select a saved document revision and PDF.');const q=parsedQuery.data;
  const first=descriptor.safeParse(await backend.authorize(token,q));if(!first.success)throw new CmsGatewayError(404,'Document preview is unavailable.');const file=first.data;
  if(file.site!==q.site||file.record!==q.record||file.revision!==q.revision||file.id!==q.asset||file.key!==`${q.site}/${q.asset}/delivery.pdf`)throw new CmsGatewayError(503,'Document preview is unavailable.');
  const response=await backend.read(token,file);
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!=='application/pdf')throw new CmsGatewayError(503,'Document preview failed verification.');
  const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==file.bytes))throw new CmsGatewayError(503,'Document preview failed verification.');
  const reader=response.body?.getReader();if(!reader)throw new CmsGatewayError(503,'Document preview is empty.');
  const bytes=new Uint8Array(file.bytes);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>bytes.length)throw new CmsGatewayError(503,'Document preview failed verification.');bytes.set(value,offset);offset+=value.length;}}
  catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new CmsGatewayError(503,'Document preview failed verification.');
  // Recheck current membership/rights and the revision binding after the private
  // read. Never deliver bytes using an authorization revoked during transfer.
  const latest=descriptor.safeParse(await backend.authorize(token,q));
  if(!latest.success||JSON.stringify(latest.data)!==JSON.stringify(file))throw new CmsGatewayError(403,'Document preview access changed. Reload the document.');
  return new Response(bytes,{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="document.pdf"','Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'self'",'Cross-Origin-Resource-Policy':'same-origin'}});
 }catch(error){return cmsErrorResponse(error);}
}
