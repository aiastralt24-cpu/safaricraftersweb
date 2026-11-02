import {createHash,timingSafeEqual} from 'node:crypto';
import {runValidationQueue} from './validation-queue-worker.ts';
import type {ValidationQueueRpc} from './validation-queue-worker.ts';
const procedures=['claim_validations','get_validation_job_input','finish_validation_job'];
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export function createValidationRpc(config:{url:string;serviceKey:string},fetcher:typeof fetch=fetch):ValidationQueueRpc{
 let base:URL;try{base=new URL(config.url);}catch{throw Error('Worker connection is not configured.');}
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey||/[\r\n]/.test(config.serviceKey))throw Error('Worker connection is not configured.');
 return async(procedure,args)=>{
  if(!procedures.includes(procedure))throw Error('Invalid validation operation.');
  try{
   const response=await fetcher(new URL(`/rest/v1/rpc/${procedure}`,base),{method:'POST',headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();
   if(response.status===204)return null;
   const reader=response.body?.getReader();if(!reader)throw Error();
   const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  }catch{throw Error('Validation worker database operation failed.');}
 };
}
export type ValidationRuntime={secret:string;rpc:ValidationQueueRpc};
export function validationRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ValidationRuntime|null{
 if(env.CMS_VALIDATION_WORKER_ENABLED!=='true'||!env.CMS_VALIDATION_WORKER_SECRET||!/^[-A-Za-z0-9_]{32,256}$/.test(env.CMS_VALIDATION_WORKER_SECRET))return null;
 try{return {secret:env.CMS_VALIDATION_WORKER_SECRET,rpc:createValidationRpc({url:env.CMS_SUPABASE_URL||'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher)};}catch{return null;}
}
export async function handleValidationRun(request:Request,config:ValidationRuntime|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers});
 if(!config)return respond(503,{error:'Validation worker is not configured.'});
 // Fixed-length digests avoid timing differences and byte-length surprises.
 const received=request.headers.get('authorization')||'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(!['GET','POST'].includes(request.method)||new URL(request.url).search||request.body!==null)return respond(400,{error:'Send an empty worker request without query parameters.'});
 try{
  const outcomes=await runValidationQueue(config.rpc,10);
  const counts={valid:0,invalid:0,retryPending:0,unacknowledged:0};
  for(const outcome of outcomes){if(outcome.status==='retry_pending')counts.retryPending++;else counts[outcome.status]++;}
  return respond(counts.retryPending||counts.unacknowledged?503:200,{processed:outcomes.length,...counts});
 }catch{return respond(503,{error:'Validation worker is temporarily unavailable.'});}
}
