import {z} from 'zod';
import {deliverDurableNotifications,type NotificationDispatchRpc} from './lead-notification-dispatch.ts';
import type {LeadNotificationAdapter} from './lead-notification-worker.ts';
const uuid=z.string().uuid();
const job=z.object({id:uuid,websiteId:uuid,leadId:uuid,leaseToken:uuid,attempt:z.number().int().min(1).max(8)}).strict();
const input=z.object({websiteId:uuid,leadId:uuid,formId:uuid,formRevision:uuid,formTitle:z.string().min(1).max(200),routeIds:z.array(uuid).max(20).refine(v=>new Set(v).size===v.length),answers:z.record(z.string(),z.unknown()),receivedAt:z.iso.datetime({offset:true}),careerAttribution:z.unknown().optional()}).strict();
export type NotificationWorkerRpc=(name:Parameters<NotificationDispatchRpc>[0]|'reap_lead_notifications'|'claim_lead_notifications'|'get_lead_notification_input'|'finish_lead_notification',args:Record<string,unknown>)=>Promise<unknown>;
export function createLeadNotificationAdapter(rpc:NotificationWorkerRpc,options:Omit<Parameters<typeof deliverDurableNotifications>[3],'rpc'>):LeadNotificationAdapter{
 return {
  reap:async()=>z.number().int().nonnegative().parse(await rpc('reap_lead_notifications',{})),
  claim:async(limit,seconds)=>{const rows=z.array(job).max(limit).parse(await rpc('claim_lead_notifications',{p_limit:limit,p_lease_seconds:seconds}));if(new Set(rows.map(v=>v.id)).size!==rows.length)throw Error('Duplicate notification claims.');return rows;},
  read:async claim=>{const value=await rpc('get_lead_notification_input',{p_job:claim.id,p_token:claim.leaseToken});if(value===null)return null;const result=input.parse(value);if(result.websiteId!==claim.websiteId||result.leadId!==claim.leadId)throw Error('Notification input mismatch.');return result;},
  deliver:async(value,delivery)=>deliverDurableNotifications(delivery.job,value,delivery,{...options,rpc}),
  finish:async(id,token,success,errorCode)=>{await rpc('finish_lead_notification',{p_job:id,p_token:token,p_success:success,p_error_code:errorCode??null});},
 };
}
