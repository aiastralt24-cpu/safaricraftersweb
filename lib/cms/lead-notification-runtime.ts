import {z} from 'zod';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createLeadNotificationAdapter} from './lead-notification-database.ts';
import {createResendNotificationTransport} from './lead-notification-resend.ts';
import {runLeadNotificationBatch,type LeadNotificationAdapter} from './lead-notification-worker.ts';
const procedures=['reap_lead_notifications','claim_lead_notifications','get_lead_notification_input','finish_lead_notification','get_notification_dispatch','get_notification_email_route','prepare_notification_dispatch','accept_notification_dispatch','record_notification_worker_health','accept_notification_dispatch_for_deployment','claim_notification_probe','get_notification_probe_dispatch','prepare_notification_probe','accept_notification_probe','record_probe_reconciliation'] as const;
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export function createNotificationWorkerRpc(config:{url:string;serviceKey:string},fetcher:typeof fetch=fetch):((name:typeof procedures[number],args:Record<string,unknown>)=>Promise<unknown>){
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!config.serviceKey||/\s/.test(config.serviceKey))throw Error('Notification database is not configured.');
 return async(name,args)=>{
  if(!procedures.includes(name))throw Error('Invalid notification database operation.');
  try{
   const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error();if(response.status===204)return null;
   const reader=response.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_500_000)throw Error();chunks.push(value);}}finally{await reader.cancel();}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  }catch{throw Error('Notification database operation failed.');}
 };
}
export type NotificationRuntime={secret:string;adapter:LeadNotificationAdapter;reportHealth:(healthy:boolean)=>Promise<void>};
export function notificationRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):NotificationRuntime|null{
 const secret=env.CMS_NOTIFICATION_WORKER_SECRET;
 if(env.CMS_NOTIFICATION_WORKER_ENABLED!=='true'||!secret||!/^[-A-Za-z0-9_]{32,256}$/.test(secret))return null;
 try{
  const deployment=z.string().uuid().parse(env.CMS_NOTIFICATION_DEPLOYMENT_ID);
  const origin=new URL(env.CMS_NOTIFICATION_CMS_ORIGIN||'');if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)return null;
  const rpc=createNotificationWorkerRpc({url:env.CMS_SUPABASE_URL||'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher);
  const send=createResendNotificationTransport(env.CMS_NOTIFICATION_RESEND_API_KEY||'',fetcher);
  return {secret,adapter:createLeadNotificationAdapter((name,args)=>name==='accept_notification_dispatch'?rpc('accept_notification_dispatch_for_deployment',{...args,p_deployment:deployment,p_origin:origin.origin}):rpc(name,args),{send,cmsOrigin:origin.origin}),reportHealth:async healthy=>{
   const result=z.object({deploymentId:z.string().uuid(),cmsOrigin:z.string(),workerVersion:z.literal('notification-1'),healthy:z.boolean(),observedAt:z.iso.datetime({offset:true})}).strict().parse(await rpc('record_notification_worker_health',{p_deployment:deployment,p_origin:origin.origin,p_version:'notification-1',p_healthy:healthy}));
   if(result.deploymentId!==deployment||result.cmsOrigin!==origin.origin||result.healthy!==healthy||Math.abs(Date.now()-Date.parse(result.observedAt))>30000)throw Error('Notification health receipt mismatch.');
  }};
 }catch{return null;}
}
/** POST only; configuration and authentication are checked before any provider operation. */
export async function handleNotificationRun(request:Request,config:NotificationRuntime|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers});
 if(!config)return respond(503,{error:'Notification worker is not configured.'});
 const received=request.headers.get('authorization')||'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(request.method!=='POST'||new URL(request.url).search||request.body!==null)return respond(400,{error:'Send an empty POST worker request without query parameters.'});
 try{
  const result=await runLeadNotificationBatch(config.adapter,10),counts={succeeded:0,failed:0,retry_pending:0,unacknowledged:0};
  for(const outcome of result.outcomes)counts[outcome.status]++;
  const healthy=!(counts.failed||counts.retry_pending||counts.unacknowledged);await config.reportHealth(healthy);
  return respond(healthy?200:503,{processed:result.outcomes.length,reaped:result.reaped,...counts});
 }catch{try{await config.reportHealth(false);}catch{/* A failed health write must never turn a worker failure into success. */}return respond(503,{error:'Notification worker is temporarily unavailable.'});}
}
