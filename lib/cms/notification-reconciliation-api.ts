import {z} from 'zod';
import {notificationEmailSchema} from './lead-notification-email.ts';
import {createResendNotificationEvidenceReader} from './notification-provider-evidence.ts';
import {bearerToken,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {readBoundedJson} from './editor-api.ts';
import {notificationReconciliationCommand,receiptSchema,checkScope} from './notification-reconciliation.ts';
const uuid=z.string().uuid();
const intentSchema=z.object({websiteId:uuid,leadId:uuid,jobId:uuid,dispatchId:uuid,providerMessageId:uuid,requestId:uuid,actorId:uuid,firstAttemptAt:z.iso.datetime({offset:true}),message:notificationEmailSchema,receipt:receiptSchema.nullable()}).strict();
export type ReconciliationDependencies={
 begin:(token:string,args:Record<string,unknown>)=>Promise<unknown>;
 readEvidence:ReturnType<typeof createResendNotificationEvidenceReader>;
 record:(args:Record<string,unknown>)=>Promise<unknown>;
};
/** Browser supplies identities only. Actor, frozen payload and evidence come from trusted services. */
export async function handleNotificationReconciliation(request:Request,dependencies:ReconciliationDependencies|null){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(request.method!=='POST'||new URL(request.url).search)throw new CmsGatewayError(400,'Use a POST request without query parameters.');
  const parsed=notificationReconciliationCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the notification and provider reference.');
  if(!dependencies)throw new CmsGatewayError(503,'Notification reconciliation is not configured.');
  const c=parsed.data;
  const intent=intentSchema.parse(await dependencies.begin(token,{p_site:c.site,p_lead:c.leadId,p_job:c.jobId,p_dispatch:c.dispatchId,p_provider_id:c.providerMessageId,p_request:c.requestId}));checkScope(intent,c);
  // Even a previously recorded intent goes through the service finalizer, which rechecks current access.
  const evidence=intent.receipt?null:await dependencies.readEvidence({dispatchId:intent.dispatchId,providerMessageId:intent.providerMessageId,firstAttemptAt:intent.firstAttemptAt,message:intent.message});
  const receipt=receiptSchema.parse(await dependencies.record({p_site:c.site,p_actor:intent.actorId,p_request:c.requestId,p_message:intent.message,p_evidence:evidence}));checkScope(receipt,c);
  if(receipt.actorId!==intent.actorId)throw Error('Reconciliation actor mismatch.');
  return Response.json({result:receipt},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
export function notificationReconciliationRuntime(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ReconciliationDependencies|null{
 if(env.CMS_NOTIFICATION_RECONCILIATION_ENABLED!=='true')return null;
 try{
  const base=new URL(env.CMS_SUPABASE_URL||''),key=env.CMS_SUPABASE_SERVICE_ROLE_KEY||'';
  if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!key||/\s/.test(key))return null;
  const readEvidence=createResendNotificationEvidenceReader(env.CMS_NOTIFICATION_RESEND_API_KEY||'',fetcher);
  return {
   begin:(token,args)=>cmsRpc({url:base.origin,key:env.CMS_SUPABASE_ANON_KEY||''},token,'begin_notification_reconciliation',args,fetcher),
   readEvidence,
   record:async args=>{
    try{
     const response=await fetcher(new URL('/rest/v1/rpc/record_notification_reconciliation',base),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
     if(!response.ok)throw Error();
     const reader=response.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let bytes=0;
     try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384)throw Error();chunks.push(value);}}finally{await reader.cancel();}
     return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
    }catch{throw new CmsGatewayError(503,'Notification resolution could not be confirmed. Retry the same request.');}
   },
  };
 }catch{return null;}
}
