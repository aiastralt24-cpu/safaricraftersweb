import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {createNotificationWorkerRpc} from './lead-notification-runtime.ts';
import {createResendNotificationTransport} from './lead-notification-resend.ts';
import {deliverNotificationProbe,notificationProbeOriginSchema,type NotificationProbeIdentity} from './notification-probe.ts';
const uuid=z.string().uuid();
const commandSchema=z.object({probeId:uuid,websiteId:uuid,routeId:uuid,routeRevision:uuid}).strict();
const responseHeaders={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export type ProbeRuntime={secret:string;run:(command:z.infer<typeof commandSchema>)=>Promise<void>};
/** Separate rollout gate. A caller can select only an existing authorized request;
 * deployment and origin always come from this runtime's configuration. */
export function notificationProbeRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ProbeRuntime|null{
 if(env.CMS_NOTIFICATION_PROBES_ENABLED!=='true'||env.CMS_NOTIFICATION_WORKER_ENABLED!=='true')return null;
 const secret=env.CMS_NOTIFICATION_WORKER_SECRET;if(!secret||!/^[-A-Za-z0-9_]{32,256}$/.test(secret))return null;
 try{
  const deploymentId=uuid.parse(env.CMS_NOTIFICATION_DEPLOYMENT_ID);
  const url=new URL(env.CMS_NOTIFICATION_CMS_ORIGIN||'');
  const cmsOrigin=notificationProbeOriginSchema.parse(url.origin);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  const rpc=createNotificationWorkerRpc({url:env.CMS_SUPABASE_URL||'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher);
  const send=createResendNotificationTransport(env.CMS_NOTIFICATION_RESEND_API_KEY||'',fetcher);
  return {secret,run:async raw=>{
   const command=commandSchema.parse(raw),identity:NotificationProbeIdentity={...command,deploymentId,cmsOrigin};
   const lease=z.object({probeId:uuid,leaseToken:uuid}).strict().parse(await rpc('claim_notification_probe',{p_probe:identity.probeId,p_deployment:deploymentId,p_origin:cmsOrigin}));
   if(lease.probeId!==identity.probeId)throw Error('Notification verification lease mismatch.');
   const args={p_probe:identity.probeId,p_token:lease.leaseToken};
   await deliverNotificationProbe(identity,{read:()=>rpc('get_notification_probe_dispatch',args),prepare:()=>rpc('prepare_notification_probe',args),accept:(_,provider)=>rpc('accept_notification_probe',{...args,p_provider:provider}),send},90000);
  }};
 }catch{return null;}
}
export async function handleNotificationProbe(request:Request,config:ProbeRuntime|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers:responseHeaders});
 if(!config)return respond(503,{error:'Notification verification is not configured.'});
 const received=request.headers.get('authorization')||'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(request.method!=='POST'||new URL(request.url).search||request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return respond(400,{error:'Send a JSON POST verification request without query parameters.'});
 let command:z.infer<typeof commandSchema>;
 try{
  const reader=request.body?.getReader();if(!reader)throw Error();let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096)throw Error();chunks.push(value);}}finally{await reader.cancel();}
  command=commandSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));
 }catch{return respond(400,{error:'Invalid notification verification request.'});}
 try{await config.run(command);return respond(200,{accepted:true});}
 catch{return respond(503,{error:'Notification verification could not be confirmed. Recover this request before starting another.'});}
}
