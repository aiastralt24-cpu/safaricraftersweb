import {z} from 'zod';
import {notificationEmailSchema,notificationEmailRouteSchema,prepareLeadNotificationEmail} from './lead-notification-email.ts';
import type {LeadNotificationJob,LeadNotificationDelivery} from './lead-notification-worker.ts';
const uuid=z.string().uuid();
const dispatchSchema=z.object({dispatchId:uuid,websiteId:uuid,jobId:uuid,routeId:uuid,routeRevision:uuid,state:z.enum(['ready','accepted','route_unavailable','reconciliation_required']),idempotencyKey:z.string(),firstAttemptAt:z.iso.datetime({offset:true}),message:notificationEmailSchema.nullable(),providerMessageId:uuid.nullable()}).strict().superRefine((v,c)=>{
 if(v.idempotencyKey!==`cms-notification:${v.dispatchId}`||(v.state==='ready')!==(v.message!==null)||(v.state==='accepted')!==(v.providerMessageId!==null))c.addIssue({code:'custom',message:'Invalid notification dispatch state.'});
});
export type NotificationDispatchRpc=(name:'get_notification_dispatch'|'get_notification_email_route'|'prepare_notification_dispatch'|'accept_notification_dispatch',args:Record<string,unknown>)=>Promise<unknown>;
type Send=(request:{idempotencyKey:string;firstAttemptAt:string;message:z.infer<typeof notificationEmailSchema>},timeoutMs:number)=>Promise<{provider:'resend';messageId:string}>;
/** A retry reads existing durable state first; it never regenerates a prepared email. */
export async function deliverDurableNotifications(job:LeadNotificationJob,input:LeadNotificationDelivery,options:{timeoutMs:number},dependencies:{rpc:NotificationDispatchRpc;send:Send;cmsOrigin:string;now?:()=>number}){
 const routes=z.array(uuid).min(1).max(20).refine(v=>new Set(v).size===v.length).parse(input.routeIds);
 if(input.websiteId!==job.websiteId||input.leadId!==job.leadId||!Number.isInteger(options.timeoutMs)||options.timeoutMs<1000||options.timeoutMs>90000)throw Error('Notification job mismatch.');
 const now=dependencies.now??Date.now,deadline=now()+options.timeoutMs;
 const budget=()=>{const remaining=deadline-now();if(!Number.isFinite(remaining)||remaining<1000)throw Error('Notification delivery budget exhausted.');return Math.min(10000,remaining);};
 for(const routeId of routes){
  budget();const base={p_job:job.id,p_token:job.leaseToken,p_route:routeId};
  const verify=(raw:unknown)=>{const value=dispatchSchema.parse(raw);if(value.websiteId!==job.websiteId||value.jobId!==job.id||value.routeId!==routeId)throw Error('Notification dispatch mismatch.');return value;};
  let raw=await dependencies.rpc('get_notification_dispatch',base);
  if(raw===null){
   budget();const route=notificationEmailRouteSchema.parse(await dependencies.rpc('get_notification_email_route',base));
   if(route.websiteId!==job.websiteId||route.routeId!==routeId)throw Error('Notification route mismatch.');
   const message=prepareLeadNotificationEmail(input,route,dependencies.cmsOrigin);
   budget();raw=await dependencies.rpc('prepare_notification_dispatch',{...base,p_revision:route.revisionId,p_message:message});
   const prepared=verify(raw);if(prepared.routeRevision!==route.revisionId||(prepared.state==='ready'&&JSON.stringify(prepared.message)!==JSON.stringify(message)))throw Error('Prepared notification mismatch.');
  }
  const dispatch=verify(raw);if(dispatch.state==='accepted')continue;
  if(dispatch.state!=='ready'||!dispatch.message)throw Error('Notification dispatch requires attention.');
  const receipt=await dependencies.send({idempotencyKey:dispatch.idempotencyKey,firstAttemptAt:dispatch.firstAttemptAt,message:dispatch.message},budget());
  if(receipt.provider!=='resend'||!uuid.safeParse(receipt.messageId).success)throw Error('Invalid notification provider receipt.');
  // Acknowledge even if the send consumed the budget: persisting acceptance prevents repeat sends.
  const accepted=verify(await dependencies.rpc('accept_notification_dispatch',{p_job:job.id,p_token:job.leaseToken,p_dispatch:dispatch.dispatchId,p_provider_id:receipt.messageId}));
  if(accepted.state!=='accepted'||accepted.dispatchId!==dispatch.dispatchId||accepted.routeRevision!==dispatch.routeRevision||accepted.firstAttemptAt!==dispatch.firstAttemptAt||accepted.providerMessageId!==receipt.messageId)throw Error('Notification acceptance could not be confirmed.');
 }
}
