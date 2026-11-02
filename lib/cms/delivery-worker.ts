export type DeliveryJob={id:string;websiteId:string;recordId:string;revisionId:string;operation:'publish'|'unpublish';path:string|null;locale:string;contentType:string;leaseToken:string;attempt:number};
export type DeliveryAdapter={
  reap():Promise<number>;
  claim(limit:number,leaseSeconds:number):Promise<DeliveryJob[]>;
  /** Invalidate page, shared dependencies, listings, sitemap and search. Do not
   * republish job.revisionId: it may have been superseded while this job ran. */
  invalidate(job:DeliveryJob):Promise<void>;
  finish(id:string,token:string,success:boolean,errorCode?:string):Promise<void>;
};
/** All adapters are required: an unconfigured deployment cannot report delivery success. */
export async function runDeliveryBatch(adapter:DeliveryAdapter,limit=10){
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Invalid delivery batch size.');
  const reaped=await adapter.reap();
  const jobs=await adapter.claim(limit,60);
  // Start claimed work together so serial processing does not consume later leases.
  const outcomes=await Promise.all(jobs.map(async job=>{
    let success=true;
    try {await adapter.invalidate(job);}catch{success=false;}
    try {
      await adapter.finish(job.id,job.leaseToken,success,success?undefined:'invalidation_failed');
      return {id:job.id,status:success?'succeeded' as const:job.attempt>=8?'failed' as const:'retry_pending' as const};
    }catch{
      // An expired lease or DB outage leaves recovery to the lease/retry machinery.
      // Never mark a job successful locally when acknowledgement failed.
      return {id:job.id,status:'unacknowledged' as const};
    }
  }));
  return {reaped,outcomes};
}
