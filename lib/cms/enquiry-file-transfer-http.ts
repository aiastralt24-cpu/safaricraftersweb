import {createHash} from 'node:crypto';
import {z} from 'zod';
import {checkEnquiryFileTransfer,enquiryFileTransferIdentitySchema,transferEnquiryFile,type EnquiryFileTransferAdapter} from './enquiry-file-transfer.ts';
const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Origin'};
export type EnquiryFileTransferHttpConfig={site:string;origin:string;readTimeoutMs?:number;/** Must verify trusted ingress identity; do not derive it from unsigned IP headers. */adapterForRequest(request:Request):Promise<{transfer:EnquiryFileTransferAdapter;consumeRate():Promise<unknown>}>};
class BodyError extends Error{readonly status:number;constructor(status:number,message:string){super(message);this.status=status;}}
async function readBytes(request:Request,expected:number,timeout:number){
 const reader=request.body?.getReader();if(!reader)throw new BodyError(400,'Upload bytes are missing.');
 const chunks:Uint8Array[]=[];let size=0,timer:ReturnType<typeof setTimeout>|undefined,rejectDeadline:(error:unknown)=>void=()=>{};
 const deadline=new Promise<never>((_,reject)=>{rejectDeadline=reject;timer=setTimeout(()=>reject(new BodyError(408,'Upload timed out.')),timeout);});
 const abort=()=>rejectDeadline(new BodyError(400,'Upload was interrupted.'));request.signal.addEventListener('abort',abort,{once:true});
 try{
  if(request.signal.aborted)throw new BodyError(400,'Upload was interrupted.');
  while(true){const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.byteLength;if(size>expected)throw new BodyError(413,'Upload exceeds its reserved size.');chunks.push(value);}
  if(size!==expected)throw new BodyError(422,'Upload is incomplete.');return Buffer.concat(chunks,size);
 }catch(error){void reader.cancel().catch(()=>{});throw error;}
 finally{if(timer)clearTimeout(timer);request.signal.removeEventListener('abort',abort);reader.releaseLock();}
}
/** Unmounted until session creation, ingress/rate configuration and intake are connected. */
export async function handleEnquiryFileTransferHttp(request:Request,config:EnquiryFileTransferHttpConfig|null){
 const fail=(status:number,error:string,extra:Record<string,string>={})=>Response.json({ok:false,error},{status,headers:{...headers,...extra}});
 try{
  if(request.method!=='POST')return fail(405,'Use POST.',{Allow:'POST'});
  if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503,'Uploads are temporarily unavailable.');
  let origin:URL;try{origin=new URL(config.origin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||/[\s\\]/.test(config.origin))throw Error();}catch{return fail(503,'Uploads are temporarily unavailable.');}
  if(request.headers.get('origin')!==origin.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'This upload origin is not allowed.');
  const match=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'');if(!match)return fail(401,'Upload authorization is required.');
  const parsed=enquiryFileTransferIdentitySchema.safeParse({site:config.site,form:request.headers.get('x-cms-form'),revision:request.headers.get('x-cms-revision'),request:request.headers.get('x-cms-request'),session:request.headers.get('x-cms-session'),upload:request.headers.get('x-cms-upload')});
  if(!parsed.success)return fail(400,'Select a valid upload reservation.');
  const timeout=config.readTimeoutMs??120000;if(!Number.isInteger(timeout)||timeout<1||timeout>120000)return fail(503,'Uploads are temporarily unavailable.');
  const backend=await config.adapterForRequest(request);
  const rate=z.object({allowed:z.boolean(),retryAfter:z.number().int().min(1).max(600)}).strict().parse(await backend.consumeRate());
  if(!rate.allowed)return fail(429,'Too many upload attempts. Please try again later.',{'Retry-After':String(rate.retryAfter)});
  const transfer=checkEnquiryFileTransfer(await backend.transfer.authorize(parsed.data,createHash('sha256').update(match[1]).digest('hex')),parsed.data);
  if(transfer.state==='rejected')return fail(409,'This file was rejected. Choose another file.');
  const mime=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();if(mime!==transfer.mime)return fail(415,'The file type does not match its reservation.');
  const declared=request.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==transfer.bytes))return fail(413,'The file size does not match its reservation.');
  const bytes=await readBytes(request,transfer.bytes,timeout);
  if(createHash('sha256').update(bytes).digest('hex')!==transfer.sha256)return fail(422,'The file does not match its reservation.');
  // Authorize again after reading: the session may have expired or been cancelled.
  const result=await transferEnquiryFile(backend.transfer,parsed.data,match[1],bytes,mime);
  return Response.json({ok:true,result},{status:202,headers});
 }catch(error){return error instanceof BodyError?fail(error.status,error.message):fail(503,'Upload receipt could not be confirmed. Retry with the same reservation.');}
 finally{if(request.body&&!request.body.locked)void request.body.cancel().catch(()=>{});}
}
