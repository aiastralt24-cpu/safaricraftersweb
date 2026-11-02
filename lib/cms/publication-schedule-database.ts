import type {PublicationScheduleAdapter,ScheduleOutcome} from './publication-schedule-worker.ts';
import type {ValidationRpc} from './validation-worker.ts';

export type PublicationScheduleRpc=(procedure:'claim_publication_schedules'|'execute_publication_schedule'|'fail_publication_schedule',args:Record<string,unknown>)=>Promise<unknown>;
/** Server-only transports; never use privileged RPCs in the browser. */
export function createPublicationScheduleAdapter(call:PublicationScheduleRpc,validation:ValidationRpc):PublicationScheduleAdapter{
 return {
  validation,
  claim:(limit,leaseSeconds)=>call('claim_publication_schedules',{p_limit:limit,p_lease_seconds:leaseSeconds}),
  execute:async(id,token)=>{
   const result=await call('execute_publication_schedule',{p_job:id,p_token:token});
   if(!['published','unpublished','blocked','retry_pending'].includes(result as string))throw new Error('Invalid execution response.');
   return result as ScheduleOutcome;
  },
  fail:async(id,token,code)=>{
   const result=await call('fail_publication_schedule',{p_job:id,p_token:token,p_code:code});
   if(result!=='blocked'&&result!=='retry_pending')throw new Error('Invalid failure response.');
   return result;
  },
 };
}
