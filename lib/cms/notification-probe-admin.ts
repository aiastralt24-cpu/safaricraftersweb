import {z} from 'zod';
import {notificationProbeOriginSchema} from './notification-probe.ts';
const uuid=z.string().uuid();
export const notificationProbeCommand=z.object({action:z.enum(['request','cancel']),site:uuid,routeId:uuid,routeRevision:uuid,bindingRevision:uuid,requestId:uuid}).strict();
export type NotificationProbeCommand=z.infer<typeof notificationProbeCommand>;
export const probeReceipt=z.object({websiteId:uuid,actorId:uuid,requestId:uuid,probeId:uuid,routeId:uuid,routeRevision:uuid,bindingRevision:uuid,deploymentId:uuid.nullable(),cmsOrigin:notificationProbeOriginSchema.nullable(),state:z.enum(['pending','cancelled'])}).strict().superRefine((v,c)=>{
 if((v.deploymentId===null)!==(v.cmsOrigin===null)||(v.state==='pending'&&v.deploymentId===null))c.addIssue({code:'custom',message:'Invalid verification binding.'});
});
export function verifyProbeReceipt(raw:unknown,command:NotificationProbeCommand){
 const value=probeReceipt.parse(raw);
 if(value.websiteId!==command.site||value.requestId!==command.requestId||value.routeId!==command.routeId||value.routeRevision!==command.routeRevision||value.bindingRevision!==command.bindingRevision||(command.action==='cancel'&&value.state!=='cancelled'))throw Error('Verification receipt mismatch.');
 return value;
}
export function verifyProbeContext(raw:unknown,site:string,routeId:string){
 const value=z.object({websiteId:uuid,routeId:uuid,routeRevision:uuid,routeApproved:z.boolean(),bindingRevision:uuid.nullable(),deploymentId:uuid.nullable(),cmsOrigin:notificationProbeOriginSchema.nullable(),workerHealthy:z.boolean()}).strict().parse(raw);
 if(value.websiteId!==site||value.routeId!==routeId||(value.deploymentId===null)!==(value.cmsOrigin===null)||(value.deploymentId!==null&&value.bindingRevision===null))throw Error('Verification context mismatch.');return value;
}
export function verifyProbeStatus(raw:unknown,site:string,requestId:string){
 const value=z.object({receipt:probeReceipt,state:z.enum(['cancelled','accepted','in_progress','unavailable','reconciliation_required','ready']),firstAttemptAt:z.iso.datetime({offset:true}).nullable(),providerMessageId:uuid.nullable(),leaseUntil:z.iso.datetime({offset:true}).nullable()}).strict().parse(raw);
 if(value.receipt.websiteId!==site||value.receipt.requestId!==requestId||(value.state==='cancelled')!==(value.receipt.state==='cancelled')||(value.state==='accepted')!==(value.providerMessageId!==null)||(value.state==='cancelled'&&value.firstAttemptAt!==null)||(value.state==='accepted'&&value.firstAttemptAt===null)||(value.state==='in_progress'&&value.leaseUntil===null)||(value.state==='reconciliation_required'&&value.firstAttemptAt===null))throw Error('Verification status mismatch.');return value;
}
