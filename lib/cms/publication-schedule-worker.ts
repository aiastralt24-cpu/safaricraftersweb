import {claimedPublicationSchedulesSchema} from './publication-schedule.ts';
import {runTrustedValidation,type ValidationRpc} from './validation-worker.ts';

export type ScheduleOutcome='published'|'unpublished'|'blocked'|'retry_pending';
export type PublicationScheduleAdapter={
 /** Database claims only due jobs, with a fenced lease and bounded recovery. */
 claim(limit:number,leaseSeconds:number):Promise<unknown>;
 validation:ValidationRpc;
 /** Atomic database transaction: fence token, check due time and cancellation,
  * recheck original actor permissions/current approval/pinned revision, invoke
  * existing publish/unpublish guards, enqueue delivery and finish schedule.
  * Never accept a browser-supplied actor or bypass ordinary publication guards. */
 execute(id:string,token:string):Promise<ScheduleOutcome>;
 /** Persist a safe failure under the same lease; DB controls retries/attempt cap. */
 fail(id:string,token:string,code:'validation_unavailable'|'validation_failed'):Promise<'blocked'|'retry_pending'>;
};

/** Infrastructure-independent orchestration; not an enabled scheduler. No timer
 * or privileged transport is installed until the durable adapter is verified. */
export async function runPublicationScheduleBatch(adapter:PublicationScheduleAdapter,limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Invalid schedule batch size.');
 const jobs=claimedPublicationSchedulesSchema.parse(await adapter.claim(limit,120));
 return Promise.all(jobs.map(async job=>{
  if(job.operation==='publish'){
   let failure:'validation_unavailable'|'validation_failed'|undefined;
   try{
    const result=await runTrustedValidation(adapter.validation,{site:job.site,record:job.record,revision:job.revision});
    if(!result.contentChecksPass)failure='validation_failed';
   }catch{failure='validation_unavailable';}
   if(failure){
    try{
     const status=await adapter.fail(job.id,job.token,failure);
     if(status!=='blocked'&&status!=='retry_pending')throw new Error('Invalid schedule failure acknowledgement.');
     return {id:job.id,status};
    }catch{return {id:job.id,status:'unacknowledged' as const};}
   }
  }
  try{
   const status=await adapter.execute(job.id,job.token);
   if(status!=='blocked'&&status!=='retry_pending'&&status!==(job.operation==='publish'?'published':'unpublished'))
    throw new Error('Invalid schedule execution acknowledgement.');
   return {id:job.id,status};
  }catch{
   // A lost response could follow a committed publication. Do not overwrite it
   // with failure or retry here; durable lease recovery resolves that ambiguity.
   return {id:job.id,status:'unacknowledged' as const};
  }
 }));
}
