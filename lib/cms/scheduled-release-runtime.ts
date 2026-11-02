import {createHash,timingSafeEqual} from 'node:crypto';
import {createScheduledReleaseRpc} from './publication-schedule-runtime.ts';
import {runScheduledRelease,type ScheduledReleaseRpc} from './scheduled-release-worker.ts';
import type {ValidationRpc} from './validation-worker.ts';
type GroupRpc=(procedure:Parameters<ScheduledReleaseRpc>[0]|Parameters<ValidationRpc>[0],args:Record<string,unknown>)=>Promise<unknown>;
export type ScheduledReleaseRuntime={secret:string;call:GroupRpc};
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export function scheduledReleaseRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ScheduledReleaseRuntime|null{
 const secret=env.CMS_RELEASE_SCHEDULE_WORKER_SECRET;
 if(env.CMS_RELEASE_SCHEDULE_WORKER_ENABLED!=='true'||!secret||!/^[-A-Za-z0-9_]{32,256}$/.test(secret))return null;
 try{return {secret,call:createScheduledReleaseRpc({url:env.CMS_SUPABASE_URL||'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher)};}catch{return null;}
}
export async function handleScheduledReleaseRun(request:Request,config:ScheduledReleaseRuntime|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers});
 if(!config)return respond(503,{error:'Group scheduling worker is not configured.'});
 const received=request.headers.get('authorization')||'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(!['GET','POST'].includes(request.method)||new URL(request.url).search||request.body!==null)return respond(400,{error:'Send an empty worker request without query parameters.'});
 // Leave headroom within both the 300-second route and database lease. Each
 // transport call additionally has a ten-second network timeout. If the host
 // kills execution, the database lease and immutable receipt govern recovery.
 const deadline=Date.now()+240_000;
 const call:GroupRpc=(procedure,args)=>{
  if(Date.now()>=deadline)return Promise.reject(Error('Worker deadline reached.'));
  return config.call(procedure,args);
 };
 try{
  const result=await runScheduledRelease(call,call);
  return respond(['retry_pending','unacknowledged'].includes(result.status)?503:200,{processed:result.status==='idle'?0:1,status:result.status});
 }catch{return respond(503,{error:'Group scheduling worker is temporarily unavailable.'});}
}
