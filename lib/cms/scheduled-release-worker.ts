import {z} from 'zod';
import {releaseManifestSchema} from './publication-release.ts';
import {runTrustedValidation,type ValidationRpc} from './validation-worker.ts';
const jobSchema=z.object({id:z.string().uuid(),token:z.string().uuid(),site:z.string().uuid(),request:z.string().uuid(),items:releaseManifestSchema.shape.items}).strict().superRefine((job,ctx)=>{if(new Set(job.items.map(item=>item.record)).size!==job.items.length)ctx.addIssue({code:'custom',message:'Duplicate scheduled member.'});});
export type ScheduledReleaseRpc=(procedure:'claim_scheduled_release'|'fail_scheduled_release'|'execute_scheduled_release',args:Record<string,unknown>)=>Promise<unknown>;
/** One group per invocation; at most five validations in flight. The deployment
 * must allow the 300-second database lease and up to 50 two-RPC validations.
 * No route or timer is enabled by this orchestration module. */
export async function runScheduledRelease(call:ScheduledReleaseRpc,validation:ValidationRpc){
 const raw=await call('claim_scheduled_release',{});if(raw===null)return {status:'idle' as const};
 const job=jobSchema.parse(raw),args={p_job:job.id,p_token:job.token};
 let invalid=false,unavailable=false;
 for(let offset=0;offset<job.items.length;offset+=5){
  const outcomes=await Promise.allSettled(job.items.slice(offset,offset+5).map(item=>runTrustedValidation(validation,{site:job.site,record:item.record,revision:item.revision})));
  for(const outcome of outcomes){if(outcome.status==='rejected')unavailable=true;else if(!outcome.value.contentChecksPass)invalid=true;}
  // Avoid extra dependency reads once this attempt cannot publish the group.
  if(invalid||unavailable)break;
 }
 try{
  if(invalid||unavailable){const status=await call('fail_scheduled_release',{...args,p_code:invalid?'validation_failed':'validation_unavailable'});if(status!=='blocked'&&status!=='retry_pending')throw Error('Invalid failure receipt.');return {status};}
  const status=await call('execute_scheduled_release',args);if(status!=='published'&&status!=='blocked')throw Error('Invalid execution receipt.');return {status};
 }catch{return {status:'unacknowledged' as const};}
}
