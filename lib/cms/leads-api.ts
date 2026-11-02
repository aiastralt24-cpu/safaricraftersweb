import {retentionCommands,verifyRetentionSettings,verifyRetentionPreview} from './enquiry-file-retention.ts';
import {leadAttachmentsSchema} from './lead-attachments.ts';
import {verifyNotificationDispatchReview} from './notification-dispatch-review.ts';
import {verifiedCareerApplicants} from './career-applicant-inbox.ts';
import {verifiedLeadExport} from './lead-export.ts';
import {notificationRetryCommand,verifiedNotificationRetry} from './lead-notification-recovery.ts';
import {reminderCommand,reminderScope,reminderFilter,verifiedLeadReminders,verifiedReminderReceipt} from './lead-reminders.ts';
import {routingRules,verifiedLeadRouting,verifiedRoutingOptions} from './lead-routing.ts';
import {leadMergeRequest,verifiedLeadMergeReview,verifiedLeadMergeReceipt} from './lead-merge.ts';
import {verifiedLeadDuplicates} from './lead-duplicates.ts';
import {leadAttentionFilter,verifiedLeadAttention} from './lead-attention.ts';
import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export const leadStatus=z.enum(['new','assigned','contacted','qualified','in_progress','won','lost','invalid']);
const uuid=z.string().uuid(),base={site:uuid,lead:uuid},expected=z.number().int().positive();
const commands=z.discriminatedUnion('action',[
 ...retentionCommands.options,
 z.object({action:z.literal('attachments'),...base}).strict(),
 z.object({action:z.literal('notification_dispatches'),...base,job:uuid}).strict(),
 z.object({action:z.literal('applications'),site:uuid,status:leadStatus.nullable().default(null),search:z.string().trim().max(200).default(''),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('export'),site:uuid,status:leadStatus.nullable().default(null)}).strict(),
 notificationRetryCommand,
 reminderCommand,
 z.object({action:z.literal('reminders'),site:uuid,scope:reminderScope.default('mine'),filter:reminderFilter.default('due'),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('routing'),site:uuid}).strict(),
 z.object({action:z.literal('routing_options'),site:uuid}).strict(),
 z.object({action:z.literal('save_routing'),site:uuid,expected:z.number().int().nonnegative(),rules:routingRules}).strict(),
 leadMergeRequest,
 z.object({action:z.literal('review_merge'),site:uuid,source:uuid,target:uuid}).strict(),
 z.object({action:z.literal('duplicates'),...base,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('attention'),site:uuid,filter:leadAttentionFilter.default('attention'),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('list'),site:uuid,status:leadStatus.nullable().default(null),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('get'),...base}).strict(),
 z.object({action:z.literal('assignees'),...base,search:z.string().max(200).default(''),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('update'),...base,expected,status:leadStatus,priority:z.enum(['low','normal','high']),assignedTo:uuid.nullable(),nextFollowUp:z.string().datetime({offset:true}).nullable(),outcome:z.string().max(5000),externalCrmReference:z.string().max(500).nullable()}).strict(),
 z.object({action:z.literal('note'),...base,expected,note:z.string().trim().min(1).max(5000)}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleLeadCommand(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the enquiry fields.');const c=parsed.data;let name:string,args:Record<string,unknown>;
  if(c.action==='retention'){name='get_enquiry_file_retention';args={p_site:c.site};}
  else if(c.action==='save_retention'){name='save_enquiry_file_retention';args={p_site:c.site,p_expected:c.expected,p_request:c.requestId,p_policy:c.policy};}
  else if(c.action==='preview_retention'){name='preview_enquiry_file_retention';args={p_site:c.site,p_version:c.version};}
  else if(c.action==='attachments'){name='list_lead_attachments';args={p_site:c.site,p_lead:c.lead};}
  else if(c.action==='notification_dispatches'){name='list_lead_notification_dispatches';args={p_site:c.site,p_lead:c.lead,p_job:c.job};}
  else if(c.action==='applications'){name='list_career_leads';args={p_site:c.site,p_status:c.status,p_search:c.search,p_after:c.after};}
  else if(c.action==='export'){name='export_leads';args={p_site:c.site,p_status:c.status};}
  else if(c.action==='retry_notification'){name='retry_lead_notification';args={p_site:c.site,p_lead:c.lead,p_job:c.job,p_generation:c.generation,p_request:c.requestId};}
  else if(c.action==='reminders'){name='list_lead_reminders';args={p_site:c.site,p_scope:c.scope,p_filter:c.filter,p_after:c.after,p_limit:20};}
  else if(c.action==='reminder'){name='set_lead_reminder';args={p_site:c.site,p_lead:c.lead,p_generation:c.generation,p_expected:c.expected,p_action:c.operation,p_until:c.until};}
  else if(c.action==='routing'){name='get_lead_routing';args={p_site:c.site};}
  else if(c.action==='routing_options'){name='get_lead_routing_options';args={p_site:c.site};}
  else if(c.action==='save_routing'){name='save_lead_routing';args={p_site:c.site,p_expected:c.expected,p_rules:c.rules};}
  else if(c.action==='review_merge'){name='review_lead_merge';args={p_site:c.site,p_source:c.source,p_target:c.target};}
  else if(c.action==='merge'){name='merge_leads';args={p_site:c.site,p_source:c.source,p_target:c.target,p_source_version:c.sourceVersion,p_target_version:c.targetVersion,p_request:c.requestId};}
  else if(c.action==='duplicates'){name='list_lead_duplicates';args={p_site:c.site,p_lead:c.lead,p_after:c.after,p_limit:20};}
  else if(c.action==='attention'){name='list_lead_attention';args={p_site:c.site,p_after:c.after,p_filter:c.filter,p_limit:20};}
  else if(c.action==='list'){name='list_leads';args={p_site:c.site,p_status:c.status,p_after:c.after};}
  else if(c.action==='assignees'){name='list_lead_assignees';args={p_site:c.site,p_lead:c.lead,p_search:c.search,p_after:c.after};}
  else if(c.action==='get'){name='get_lead';args={p_site:c.site,p_lead:c.lead};}
  else if(c.action==='note'){name='add_lead_note';args={p_site:c.site,p_lead:c.lead,p_expected:c.expected,p_note:c.note};}
  else{name='update_lead';args={p_site:c.site,p_lead:c.lead,p_expected:c.expected,p_status:c.status,p_priority:c.priority,p_assigned:c.assignedTo,p_follow_up:c.nextFollowUp,p_outcome:c.outcome,p_crm:c.externalCrmReference};}
  const result=await call(token,name,args);if((c.action==='get'||c.action==='duplicates')&&!result)throw new CmsGatewayError(404,'Enquiry is unavailable.');
  if(c.action==='retention'||c.action==='save_retention'){
   const value=verifyRetentionSettings(result,c.site);
   if(c.action==='save_retention'&&(value.version!==c.expected+1||JSON.stringify(value.policy)!==JSON.stringify(c.policy)))throw new CmsGatewayError(503,'Retention save could not be confirmed. Retry the same request.');
   return Response.json({result:value},{headers:privateHeaders});
  }
  if(c.action==='preview_retention')return Response.json({result:verifyRetentionPreview(result,c.site,c.version)},{headers:privateHeaders});
  if(c.action==='attachments'){if(result===null)throw new CmsGatewayError(404,'Enquiry is unavailable.');return Response.json({result:leadAttachmentsSchema.parse(result)},{headers:privateHeaders});}
  if(c.action==='notification_dispatches'){if(result===null)throw new CmsGatewayError(404,'Notification job is unavailable.');return Response.json({result:verifyNotificationDispatchReview(result,c.site,c.lead,c.job)},{headers:privateHeaders});}
  if(c.action==='applications')return Response.json({result:verifiedCareerApplicants(result,c.site,c.status,c.search,c.after)},{headers:privateHeaders});
  if(c.action==='export')return Response.json({result:verifiedLeadExport(result,c.site,c.status)},{headers:privateHeaders});
  if(c.action==='retry_notification')return Response.json({result:verifiedNotificationRetry(result,c)},{headers:privateHeaders});
  if(c.action==='reminders')return Response.json({result:verifiedLeadReminders(result,c.site,c.scope,c.filter,c.after)},{headers:privateHeaders});
  if(c.action==='reminder')return Response.json({result:verifiedReminderReceipt(result,c)},{headers:privateHeaders});
  if(c.action==='routing_options')return Response.json({result:verifiedRoutingOptions(result,c.site)},{headers:privateHeaders});
  if(c.action==='routing'||c.action==='save_routing'){const value=verifiedLeadRouting(result,c.site);if(c.action==='save_routing'&&(value.version!==c.expected+1||JSON.stringify(value.rules)!==JSON.stringify(c.rules)))throw new CmsGatewayError(503,'Assignment rule save could not be confirmed. Reload the configuration.');return Response.json({result:value},{headers:privateHeaders});}
  if(c.action==='review_merge')return Response.json({result:verifiedLeadMergeReview(result,c.site,c.source,c.target)},{headers:privateHeaders});
  if(c.action==='merge')return Response.json({result:verifiedLeadMergeReceipt(result,c)},{headers:privateHeaders});
  if(c.action==='duplicates')return Response.json({result:verifiedLeadDuplicates(result,c.site,c.lead,c.after)},{headers:privateHeaders});
  if(c.action==='attention')return Response.json({result:verifiedLeadAttention(result,c.site,c.filter,c.after)},{headers:privateHeaders});
  if(c.action==='get'&&((result as Record<string,unknown>).id!==c.lead))throw new CmsGatewayError(503,'Enquiry response does not match the requested record.');
  if(c.action==='get')return Response.json({result:{...(result as Record<string,unknown>),form:await call(token,'get_lead_form_labels',{p_site:c.site,p_lead:c.lead})}},{headers:privateHeaders});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
