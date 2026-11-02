import {readLeadCareerContext} from './lead-career-context.ts';
export type LeadNotificationJob={id:string;websiteId:string;leadId:string;leaseToken:string;attempt:number};
export type LeadNotificationInput={websiteId:string;leadId:string;formId:string;formRevision:string;formTitle:string;routeIds:string[];answers:Record<string,unknown>;receivedAt:string;careerAttribution?:unknown};
export type LeadNotificationDelivery=Omit<LeadNotificationInput,'careerAttribution'>&{career?:Extract<ReturnType<typeof readLeadCareerContext>,{status:'ready'}>['context']};
export type LeadNotificationAdapter={
 reap():Promise<number>;
 claim(limit:number,leaseSeconds:number):Promise<LeadNotificationJob[]>;
 read(job:LeadNotificationJob):Promise<LeadNotificationInput|null>;
 /** Resolve approved, current, website-scoped routes on the server. Reject absent
  * routes/configuration. Never derive recipients from answers. Use durable per-route dispatch keys
  * and persisted messages/receipts across retries.
  * Apply a deadline shorter than the lease. Resolve only after provider acceptance. */
 deliver(input:LeadNotificationDelivery,options:{job:LeadNotificationJob;idempotencyKey:string;timeoutMs:number}):Promise<void>;
 finish(id:string,token:string,success:boolean,errorCode?:string):Promise<void>;
};
export async function runLeadNotificationBatch(adapter:LeadNotificationAdapter,limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid notification batch size.');
 const reaped=await adapter.reap(),jobs=await adapter.claim(limit,120);
 const outcomes=await Promise.all(jobs.map(async job=>{
  let success=false,errorCode='notification_delivery_failed';
  try{
   const input=await adapter.read(job);
   if(!input||input.websiteId!==job.websiteId||input.leadId!==job.leadId){errorCode='notification_input_unavailable';}
   else if(!Array.isArray(input.routeIds)||!input.routeIds.length){errorCode='notification_routes_missing';}
   else{
    const career=input.careerAttribution===null||input.careerAttribution===undefined?{status:'none' as const}:readLeadCareerContext(input.careerAttribution,{formId:input.formId,formRevision:input.formRevision});
    if(career.status==='invalid'||(input.careerAttribution!=null&&career.status!=='ready'))errorCode='notification_career_context_invalid';
    else{
     // Only verified historical job fields reach the delivery adapter.
     const delivery:LeadNotificationDelivery={websiteId:input.websiteId,leadId:input.leadId,formId:input.formId,formRevision:input.formRevision,formTitle:input.formTitle,routeIds:input.routeIds,answers:input.answers,receivedAt:input.receivedAt,...(career.status==='ready'?{career:career.context}:{})};
     await adapter.deliver(delivery,{job,idempotencyKey:`lead-notification:${job.id}`,timeoutMs:90000});success=true;
    }
   }
  }catch{/* Never store provider errors or enquiry contents in job error text. */}
  try{await adapter.finish(job.id,job.leaseToken,success,success?undefined:errorCode);return {id:job.id,status:success?'succeeded' as const:job.attempt>=8?'failed' as const:'retry_pending' as const};}
  catch{return {id:job.id,status:'unacknowledged' as const};}
 }));
 return {reaped,outcomes};
}
