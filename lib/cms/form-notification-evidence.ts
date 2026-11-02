import {z} from 'zod';
import {formSchema} from './forms.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const formNotificationEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,delivery:z.object({bindingRevision:uuid.nullable(),deploymentId:uuid.nullable(),cmsOrigin:z.string().url().nullable(),workerHealthy:z.boolean(),routes:z.array(z.object({routeId:uuid,routeRevision:uuid.nullable(),providerAcceptance:z.boolean()}).strict()).max(20)}).strict().optional(),routes:z.array(z.object({routeId:uuid,revisionId:uuid.nullable(),approved:z.boolean(),acceptedAt:z.iso.datetime({offset:true}).nullable()}).strict()).max(20)}).strict();
/** Diagnostics only: a historical receipt does not certify current worker/provider availability. */
export function formNotificationFindings(input:{site:string;record:string;revision:string;payload:unknown},raw:unknown):ContentFinding[]{
 const form=formSchema.safeParse(input.payload);if(!form.success||!form.data.notificationRouteIds.length)return [];
 const evidence=formNotificationEvidenceSchema.safeParse(raw),error=(field:string,code:string,message:string):ContentFinding=>({field,code,message,severity:'error'});
 if(!evidence.success||evidence.data.websiteId!==input.site||evidence.data.recordId!==input.record||evidence.data.revisionId!==input.revision||JSON.stringify(evidence.data.routes.map(v=>v.routeId))!==JSON.stringify(form.data.notificationRouteIds))return [error('notificationRouteIds','notification_evidence_unavailable','Recipient evidence does not match this saved form revision. Request a fresh validation.')];
 const findings:ContentFinding[]=evidence.data.routes.flatMap((route,index)=>{
  const field=`notificationRouteIds.${index}`;
  if(!route.revisionId)return [error(field,'notification_route_missing','This recipient route is unavailable in this website. Choose an approved route or remove it.')];
  if(!route.approved)return [error(field,'notification_route_unapproved','This recipient route is disabled or needs approval. Ask a notification approver to review its current configuration.')];
  if(!route.acceptedAt)return [error(field,'notification_route_unproven','No completed notification or setup verification has a provider acceptance receipt for this exact recipient configuration. Staging delivery verification is still required.')];
  return [{field,code:'notification_historical_acceptance',severity:'warning' as const,message:'A completed notification or setup verification has a provider acceptance receipt for this configuration. This is provider acceptance, not proof of inbox delivery or that the recipient read the message.'}];
 });
 const delivery=evidence.data.delivery;
 if(!delivery?.deploymentId||!delivery.bindingRevision||!delivery.cmsOrigin){findings.push(error('notificationRouteIds','notification_deployment_unbound','No worker deployment is bound to this website. Ask the deployment administrator to configure and verify it.'));return findings;}
 if(delivery.routes.length!==evidence.data.routes.length||delivery.routes.some((r,i)=>r.routeId!==evidence.data.routes[i].routeId||r.routeRevision!==evidence.data.routes[i].revisionId)){findings.push(error('notificationRouteIds','notification_delivery_evidence_mismatch','Deployment delivery evidence does not match the selected recipient revisions. Request a fresh validation.'));return findings;}
 if(!delivery.workerHealthy)findings.push(error('notificationRouteIds','notification_worker_unhealthy','The selected deployment has no fresh healthy worker observation. Check its scheduler and configuration.'));
 delivery.routes.forEach((r,i)=>{if(!r.providerAcceptance)findings.push(error(`notificationRouteIds.${i}`,'notification_deployment_unproven','This deployment has no completed notification or setup verification with provider acceptance for the current recipient configuration. Verify delivery in staging.'));});
 return findings;
}
