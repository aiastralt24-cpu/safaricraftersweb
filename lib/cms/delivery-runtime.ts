import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {runDeliveryBatch,type DeliveryAdapter} from './delivery-worker.ts';
const procedures=['claim_site_delivery','reap_site_delivery','finish_delivery'];
type DeliveryRpc=(procedure:'claim_site_delivery'|'reap_site_delivery'|'finish_delivery',args:Record<string,unknown>)=>Promise<unknown>;
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const uuid=z.string().uuid();
const jobs=z.array(z.object({id:uuid,websiteId:uuid,recordId:uuid,revisionId:uuid,operation:z.enum(['publish','unpublish']),path:z.string().nullable(),locale:z.string(),contentType:z.string(),leaseToken:uuid,attempt:z.number().int().min(1).max(8)}).strict()).max(10);
export function createDeliveryRpc(config:{url:string;serviceKey:string},fetcher:typeof fetch=fetch):DeliveryRpc{
 let base:URL;try{base=new URL(config.url);}catch{throw Error('Worker connection is not configured.');}
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey||/[\r\n]/.test(config.serviceKey))throw Error('Worker connection is not configured.');
 return async(procedure,args)=>{
  if(!procedures.includes(procedure))throw Error('Invalid delivery operation.');
  try{
   const response=await fetcher(new URL(`/rest/v1/rpc/${procedure}`,base),{method:'POST',headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();
   if(response.status===204)return null;
   const reader=response.body?.getReader();if(!reader)throw Error();
   const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  }catch{throw Error('Delivery worker database operation failed.');}
 };
}

export function deliveryRuntime(invalidate:()=>void|Promise<void>,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):{secret:string;adapter:DeliveryAdapter}|null{
 const secret=env.CMS_DELIVERY_WORKER_SECRET,site=env.CMS_WEBSITE_ID;
 if(env.CMS_DELIVERY_WORKER_ENABLED!=='true'||!secret||!/^[-A-Za-z0-9_]{32,256}$/.test(secret)||!uuid.safeParse(site).success)return null;
 try{
  const rpc=createDeliveryRpc({url:env.CMS_SUPABASE_URL||'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher);
  return {secret,adapter:{
   reap:async()=>z.number().int().nonnegative().parse(await rpc('reap_site_delivery',{p_site:site})),
   claim:async(limit,leaseSeconds)=>{const batch=jobs.parse(await rpc('claim_site_delivery',{p_site:site,p_limit:limit,p_lease_seconds:leaseSeconds}));if(batch.some(job=>job.websiteId!==site)||new Set(batch.map(job=>job.id)).size!==batch.length)throw Error('Delivery identity mismatch.');return batch;},
   invalidate:async()=>{await invalidate();},
   finish:async(id,token,success,errorCode)=>{await rpc('finish_delivery',{p_job:id,p_token:token,p_success:success,p_error_code:errorCode??null});},
  }};
 }catch{return null;}
}
export async function handleDeliveryRun(request:Request,config:ReturnType<typeof deliveryRuntime>){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers});
 if(!config)return respond(503,{error:'Delivery worker is not configured.'});
 const received=request.headers.get('authorization')||'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(!['GET','POST'].includes(request.method)||new URL(request.url).search||request.body!==null)return respond(400,{error:'Send an empty worker request without query parameters.'});
 try{
  const result=await runDeliveryBatch(config.adapter,10),counts={succeeded:0,failed:0,retryPending:0,unacknowledged:0};
  for(const outcome of result.outcomes){if(outcome.status==='retry_pending')counts.retryPending++;else counts[outcome.status]++;}
  return respond(counts.failed||counts.retryPending||counts.unacknowledged?503:200,{reaped:result.reaped,processed:result.outcomes.length,...counts});
 }catch{return respond(503,{error:'Delivery worker is temporarily unavailable.'});}
}
