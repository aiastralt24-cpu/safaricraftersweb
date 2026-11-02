import {z} from 'zod';
import {checkEnquiryFileCleanupJob,type EnquiryFileCleanupJob,type EnquiryFileCleanupAdapter} from './enquiry-file-cleanup-worker.ts';
export type EnquiryFileCleanupDispatchAdapter=EnquiryFileCleanupAdapter&{list(limit:number):Promise<unknown>};
/** Privileged transport. Storage deletion is confined to exact keys returned by
 * a checked claim in this adapter instance. No user-provided prefix is accepted. */
export function createEnquiryFileCleanupStorage(config:{site:string;url:string;serviceKey:string},fetcher:typeof fetch=fetch):EnquiryFileCleanupDispatchAdapter{
 z.string().uuid().parse(config.site);const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey||/[\r\n]/.test(config.serviceKey))throw Error('Cleanup storage is not configured.');
 async function smallJson(response:Response){
  const reader=response.body?.getReader();if(!reader)throw Error('Cleanup response is invalid.');const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536)throw Error('Cleanup response is too large.');chunks.push(part.value);}}
  catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }
 const headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`},claims=new Map<string,EnquiryFileCleanupJob>();
 async function rpc(name:string,args:Record<string,unknown>){const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Cleanup database is unavailable.');return smallJson(response);}
 function claimed(job:EnquiryFileCleanupJob){const value=checkEnquiryFileCleanupJob(job,config.site,job.upload);if(JSON.stringify(claims.get(job.upload))!==JSON.stringify(value))throw Error('Cleanup lease mismatch.');return value;}
 function path(key:string){if(![...claims.values()].some(job=>job.keys.includes(key)))throw Error('Cleanup key is not claimed.');return key;}
 return {
  list:limit=>{if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid cleanup batch.');return rpc('list_enquiry_file_cleanup',{p_site:config.site,p_limit:limit});},
  claim:async(site,upload)=>{if(site!==config.site)throw Error('Cleanup website mismatch.');z.string().uuid().parse(upload);const raw=await rpc('claim_enquiry_file_cleanup',{p_site:site,p_upload:upload});if(raw===null)return null;const job=checkEnquiryFileCleanupJob(raw,site,upload);claims.set(upload,job);return job;},
  remove:async key=>{path(key);const response=await fetcher(new URL('/storage/v1/object/cms-enquiry-files',base),{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[key]}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});void response.body?.cancel().catch(()=>{});if(!response.ok)throw Error('Cleanup storage removal is unconfirmed.');},
  missing:async key=>{path(key);const response=await fetcher(new URL(`/storage/v1/object/info/cms-enquiry-files/${key}`,base),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(response.ok){void response.body?.cancel().catch(()=>{});return false;}
   // Generic 404s may mean a missing bucket or proxy route, not an absent object.
   if(response.status!==404){void response.body?.cancel().catch(()=>{});throw Error('Cleanup absence is unconfirmed.');}
   const body=await smallJson(response);if(body?.code!=='NoSuchKey'||String(body.statusCode??404)!=='404')throw Error('Cleanup absence is unconfirmed.');return true;
  },
  finish:async input=>{const job=claimed(input);try{return await rpc('finish_enquiry_file_cleanup',{p_site:config.site,p_upload:job.upload,p_token:job.leaseToken});}finally{claims.delete(job.upload);}},
  fail:async input=>{const job=claimed(input);try{await rpc('fail_enquiry_file_cleanup',{p_site:config.site,p_upload:job.upload,p_token:job.leaseToken});}finally{claims.delete(job.upload);}},
 };
}
