import {z} from 'zod';
import {mkdtemp,open,rm,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const descriptor=z.object({id:uuid,site:uuid,key:z.string(),mime:z.literal('application/pdf'),bytes:z.number().int().min(1).max(25_000_000)}).strict();
export type DocumentTransfer=z.infer<typeof descriptor>;
export type DocumentTransferAdapter={authorize:(token:string,site:string,id:string)=>Promise<unknown>;put:(token:string,transfer:DocumentTransfer,file:string,signal:AbortSignal)=>Promise<void>};
/** Streams an already size-checked private spool file, never a user filename. */
export async function putPrivateDocument(config:{url:string;key:string},token:string,input:DocumentTransfer,file:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const transfer=descriptor.parse(input);let base:URL;
 try{base=new URL(config.url);}catch{throw new CmsGatewayError(503,'CMS document storage is not configured.');}
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.key||transfer.key!==`${transfer.site}/${transfer.id}/original`)throw new CmsGatewayError(503,'Invalid private document destination.');
 const info=await stat(file);if(!info.isFile()||info.size!==transfer.bytes)throw new CmsGatewayError(422,'The private document file does not match its reservation.');
 const stream=createReadStream(file);let response:Response;
 try{
  response=await fetcher(new URL(`/storage/v1/object/cms-document-originals/${transfer.key}`,base),{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':'application/pdf','Content-Length':String(transfer.bytes),'x-upsert':'false'},body:Readable.toWeb(stream) as ReadableStream,duplex:'half',redirect:'error',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(120_000)])} as RequestInit & {duplex:'half'});
 }catch{throw new CmsGatewayError(503,'Document transfer could not be confirmed. Check upload status before retrying.');}
 finally{stream.destroy();}
 if(response.ok)return;
 let code='';try{code=(await response.json()).code;}catch{/* Provider diagnostics remain private. */}
 if(response.status===409||code==='Duplicate')throw new CmsGatewayError(409,'This document reservation already contains a file. Check its processing status; it will not be overwritten.');
 throw new CmsGatewayError(response.status===401?401:response.status===403?403:503,'The private document transfer was not accepted.');
}
const adapter:DocumentTransferAdapter={authorize:(token,site,id)=>cmsRpc(cmsConnection(),token,'get_document_upload_transfer',{p_site:site,p_upload:id}),put:(token,transfer,file,signal)=>putPrivateDocument(cmsConnection(),token,transfer,file,signal)};
async function spool(request:Request,file:string,expected:number){
 if(!request.body)throw new CmsGatewayError(400,'Document upload bytes are missing.');
 const handle=await open(file,'wx',0o600),reader=request.body.getReader();let length=0;
 let timer:ReturnType<typeof setTimeout>|undefined,rejectDeadline:(reason:unknown)=>void=()=>{};
 const deadline=new Promise<never>((_,reject)=>{rejectDeadline=reject;timer=setTimeout(()=>reject(new CmsGatewayError(408,'Document transfer timed out.')),120_000);});
 const abort=()=>rejectDeadline(new CmsGatewayError(400,'Document transfer was interrupted.'));
 request.signal.addEventListener('abort',abort,{once:true});
 try{
  if(request.signal.aborted)throw new CmsGatewayError(400,'Document transfer was interrupted.');
  while(true){
   const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;
   length+=value.byteLength;if(length>expected)throw new CmsGatewayError(413,'The document exceeds its reserved size.');
   let offset=0;while(offset<value.byteLength){const written=await Promise.race([handle.write(value,offset,value.byteLength-offset),deadline]);if(!written.bytesWritten)throw new Error('Document spool write failed.');offset+=written.bytesWritten;}
  }
  if(length!==expected)throw new CmsGatewayError(422,'The document transfer is incomplete.');
 }catch(error){void reader.cancel().catch(()=>{});throw error;}
 finally{if(timer)clearTimeout(timer);request.signal.removeEventListener('abort',abort);reader.releaseLock();await handle.close();}
}
export async function handleDocumentTransfer(request:Request,backend:DocumentTransferAdapter=adapter,enabled=process.env.CMS_DOCUMENT_UPLOADS_ENABLED==='true'){
 let directory:string|undefined;
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  if(!enabled)throw new CmsGatewayError(503,'PDF document uploads are not enabled yet.');
  const site=uuid.safeParse(request.headers.get('x-cms-site')),id=uuid.safeParse(request.headers.get('x-cms-upload'));
  if(!site.success||!id.success)throw new CmsGatewayError(400,'Select a valid document upload reservation.');
  const parsed=descriptor.safeParse(await backend.authorize(token,site.data,id.data));if(!parsed.success)throw new CmsGatewayError(404,'Document upload reservation is unavailable or expired.');const transfer=parsed.data;
  if(transfer.site!==site.data||transfer.id!==id.data||transfer.key!==`${site.data}/${id.data}/original`)throw new CmsGatewayError(503,'Invalid private document destination.');
  if(request.headers.get('content-type')?.split(';')[0].trim()!==transfer.mime)throw new CmsGatewayError(415,'The document type does not match its reservation.');
  const declared=request.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==transfer.bytes))throw new CmsGatewayError(413,'The document size does not match its reservation.');
  directory=await mkdtemp(path.join(tmpdir(),'cms-document-transfer-'));const file=path.join(directory,'original.pdf');
  await spool(request,file,transfer.bytes);if(request.signal.aborted)throw new CmsGatewayError(400,'Document transfer was interrupted.');
  await backend.put(token,transfer,file,request.signal);
  return Response.json({result:{id:transfer.id,status:'awaiting_verification'}},{status:202,headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
 finally{if(directory)await rm(directory,{recursive:true,force:true});}
}
