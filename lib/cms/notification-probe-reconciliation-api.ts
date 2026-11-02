import {z} from 'zod';
import {notificationEmailSchema} from './lead-notification-email.ts';
import {createResendNotificationEvidenceReader} from './notification-provider-evidence.ts';
import {createNotificationWorkerRpc} from './lead-notification-runtime.ts';
import {bearerToken,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {readBoundedJson} from './editor-api.ts';
import {probeReconciliationCommand,probeReconciliationReceipt,checkProbeReconciliationScope,verifyProbeReconciliationReceipt} from './notification-probe-reconciliation.ts';
const uuid=z.string().uuid();
const intentSchema=z.object({websiteId:uuid,probeId:uuid,requestId:uuid,actorId:uuid,providerMessageId:uuid,firstAttemptAt:z.iso.datetime({offset:true}),message:notificationEmailSchema,receipt:probeReconciliationReceipt.nullable()}).strict();
export type ProbeReconciliationDependencies={begin:(token:string,args:Record<string,unknown>)=>Promise<unknown>;readEvidence:ReturnType<typeof createResendNotificationEvidenceReader>;record:(args:Record<string,unknown>)=>Promise<unknown>};
export async function handleProbeReconciliation(request:Request,dependencies:ProbeReconciliationDependencies|null){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(request.method!=='POST'||new URL(request.url).search)throw new CmsGatewayError(400,'Use a POST request without query parameters.');
  const parsed=probeReconciliationCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the verification and provider reference.');
  if(!dependencies)throw new CmsGatewayError(503,'Verification reconciliation is not configured.');
  const c=parsed.data,intent=intentSchema.parse(await dependencies.begin(token,{p_site:c.site,p_probe:c.probeId,p_provider:c.providerMessageId,p_request:c.requestId}));checkProbeReconciliationScope(intent,c);
  if(intent.receipt)verifyProbeReconciliationReceipt(intent.receipt,c,intent.actorId);
  const evidence=intent.receipt?null:await dependencies.readEvidence({dispatchId:intent.probeId,providerMessageId:intent.providerMessageId,firstAttemptAt:intent.firstAttemptAt,message:intent.message});
  const receipt=verifyProbeReconciliationReceipt(await dependencies.record({p_site:c.site,p_actor:intent.actorId,p_request:c.requestId,p_message:intent.message,p_evidence:evidence}),c,intent.actorId);
  return Response.json({result:receipt},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
export function probeReconciliationRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ProbeReconciliationDependencies|null{
 if(env.CMS_NOTIFICATION_PROBE_RECONCILIATION_ENABLED!=='true')return null;
 try{
  const url=env.CMS_SUPABASE_URL||'',key=env.CMS_SUPABASE_ANON_KEY||'';if(!key||/\s/.test(key))return null;
  const rpc=createNotificationWorkerRpc({url,serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY||''},fetcher);
  const readEvidence=createResendNotificationEvidenceReader(env.CMS_NOTIFICATION_RESEND_API_KEY||'',fetcher);
  return {begin:(token,args)=>cmsRpc({url,key},token,'begin_probe_reconciliation',args,fetcher),readEvidence,record:args=>rpc('record_probe_reconciliation',args)};
 }catch{return null;}
}
