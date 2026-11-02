import {z} from 'zod';
const uuid=z.string().uuid(),instant=z.iso.datetime({offset:true}),email=z.email().max(254);
const entry=z.object({dispatchId:uuid,routeId:uuid,routeRevision:uuid,state:z.enum(['ready','accepted','route_unavailable','reconciliation_required']),firstAttemptAt:instant,acceptedAt:instant.nullable(),providerMessageId:uuid.nullable(),idempotencyKey:z.string(),needsReconciliation:z.boolean(),from:email,to:z.array(email).min(1).max(20)}).strict().superRefine((v,c)=>{
 if(v.idempotencyKey!==`cms-notification:${v.dispatchId}`||(v.state==='accepted')!==(v.providerMessageId!==null)||(v.state==='accepted')!==(v.acceptedAt!==null)||(v.state==='accepted'&&v.needsReconciliation)||(v.state==='reconciliation_required'&&!v.needsReconciliation)||(v.state==='ready'&&v.needsReconciliation))c.addIssue({code:'custom',message:'Invalid notification delivery state.'});
});
export function verifyNotificationDispatchReview(raw:unknown,site:string,lead:string,job:string){
 const value=z.object({websiteId:uuid,leadId:uuid,jobId:uuid,items:z.array(entry).max(20)}).strict().parse(raw);
 if(value.websiteId!==site||value.leadId!==lead||value.jobId!==job||new Set(value.items.map(v=>v.dispatchId)).size!==value.items.length||new Set(value.items.map(v=>v.routeId)).size!==value.items.length||value.items.some((v,i)=>i>0&&v.dispatchId<=value.items[i-1].dispatchId))throw Error('Notification delivery review mismatch.');return value;
}
