import {z} from 'zod';
import {createEnquiryFileSession,type EnquiryFileSessionCreateAdapter} from './enquiry-file-session-create.ts';
const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Origin'};
const uuid=z.string().uuid(),bodySchema=z.object({form:uuid,revision:uuid,request:uuid,session:uuid,challenge:z.string().max(2048).nullable().optional()}).strict();
export type EnquiryFileSessionHttpConfig={site:string;origin:string;readTimeoutMs?:number;adapterForRequest(request:Request):Promise<EnquiryFileSessionCreateAdapter>};
export class EnquiryFileRequestError extends Error{readonly status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export async function readEnquiryFileControlJson<T>(request:Request,timeout:number,schema:z.ZodType<T>){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new EnquiryFileRequestError(415,'Send JSON content.');
 const declared=request.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>8192))throw new EnquiryFileRequestError(413,'Upload request is too large.');
 const reader=request.body?.getReader();if(!reader)throw new EnquiryFileRequestError(400,'Upload request is missing.');
 const chunks:Uint8Array[]=[];let size=0,timer:ReturnType<typeof setTimeout>|undefined,rejectDeadline:(error:unknown)=>void=()=>{};
 const deadline=new Promise<never>((_,reject)=>{rejectDeadline=reject;timer=setTimeout(()=>reject(new EnquiryFileRequestError(408,'Upload request timed out.')),timeout);});
 const abort=()=>rejectDeadline(new EnquiryFileRequestError(400,'Upload request was interrupted.'));request.signal.addEventListener('abort',abort,{once:true});
 try{
  if(request.signal.aborted)throw new EnquiryFileRequestError(400,'Upload request was interrupted.');
  while(true){const {value,done}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.byteLength;if(size>8192)throw new EnquiryFileRequestError(413,'Upload request is too large.');chunks.push(value);}
  if(declared!==null&&size!==Number(declared))throw new EnquiryFileRequestError(400,'Upload request is incomplete.');
  try{return schema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,size))));}catch{throw new EnquiryFileRequestError(400,'Upload request is invalid.');}
 }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{if(timer)clearTimeout(timer);request.signal.removeEventListener('abort',abort);reader.releaseLock();}
}
/** Unmounted until the complete attachment lifecycle is available. */
export async function handleEnquiryFileSessionHttp(request:Request,config:EnquiryFileSessionHttpConfig|null){
 const fail=(status:number,error:string,extra:Record<string,string>={})=>Response.json({ok:false,error},{status,headers:{...headers,...extra}});
 try{
  if(request.method!=='POST')return fail(405,'Use POST.',{Allow:'POST'});
  if(!config||!uuid.safeParse(config.site).success)return fail(503,'Upload sessions are temporarily unavailable.');
  let origin:URL;try{origin=new URL(config.origin);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||/[\s\\]/.test(config.origin))throw Error();}catch{return fail(503,'Upload sessions are temporarily unavailable.');}
  if(request.headers.get('origin')!==origin.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'This upload origin is not allowed.');
  const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'');if(!token)return fail(401,'Upload authorization is required.');
  const timeout=config.readTimeoutMs??15000;if(!Number.isInteger(timeout)||timeout<1||timeout>15000)return fail(503,'Upload sessions are temporarily unavailable.');
  // Verify signed ingress before reading even this bounded JSON body.
  const adapter=await config.adapterForRequest(request);
  const {challenge,...identity}=await readEnquiryFileControlJson(request,timeout,bodySchema);
  const result=await createEnquiryFileSession(adapter,{site:config.site,...identity},token[1],challenge);
  if(result.status==='rate_limited')return fail(429,'Too many upload attempts. Please try again later.',{'Retry-After':String(result.retryAfter)});
  if(result.status==='challenge_required')return fail(422,'Complete the security check to start uploading.');
  return Response.json({ok:true,...result},{status:result.status==='created'?201:200,headers});
 }catch(error){return error instanceof EnquiryFileRequestError?fail(error.status,error.message):fail(503,'Upload session could not be confirmed. Retry with the same session and secret.');}
 finally{if(request.body&&!request.body.locked)void request.body.cancel().catch(()=>{});}
}
