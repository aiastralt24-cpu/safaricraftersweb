import {z} from 'zod';
import {notificationProbeRuntime,type ProbeRuntime} from './notification-probe-runtime.ts';
import {notificationProbeCommand,verifyProbeReceipt,verifyProbeContext,verifyProbeStatus} from './notification-probe-admin.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const execution=notificationProbeCommand.omit({action:true}).extend({action:z.literal('execute'),confirmed:z.literal(true)}).strict();
const query=z.discriminatedUnion('action',[z.object({action:z.literal('context'),site:uuid,routeId:uuid}).strict(),z.object({action:z.literal('status'),site:uuid,requestId:uuid}).strict()]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleNotificationProbeAdmin(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args),runtime:ProbeRuntime|null=notificationProbeRuntime()){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(request.method!=='POST'||new URL(request.url).search)throw new CmsGatewayError(400,'Use a POST request without query parameters.');
  const raw=await readBoundedJson(request),read=query.safeParse(raw);
  if(read.success){const c=read.data;const value=await call(token,c.action==='context'?'get_notification_probe_context':'get_notification_probe_status',c.action==='context'?{p_site:c.site,p_route:c.routeId}:{p_site:c.site,p_request:c.requestId});
   if(value===null)throw new CmsGatewayError(404,'Notification verification is unavailable.');
   return Response.json({result:c.action==='context'?verifyProbeContext(value,c.site,c.routeId):verifyProbeStatus(value,c.site,c.requestId)},{headers:privateHeaders});
  }
  const execute=execution.safeParse(raw);
  if(execute.success){
   const {confirmed:_,...input}=execute.data,c={...input,action:'request' as const};
   const status=async()=>{
    const value=await call(token,'get_notification_probe_status',{p_site:c.site,p_request:c.requestId});
    if(value===null)throw new CmsGatewayError(404,'Save the verification request before sending.');
    const checked=verifyProbeStatus(value,c.site,c.requestId);verifyProbeReceipt(checked.receipt,c);return checked;
   };
   const before=await status();
   if(before.state==='accepted')return Response.json({result:before},{headers:privateHeaders});
   if(before.state!=='ready')throw new CmsGatewayError(409,'This verification cannot be sent now. Refresh its status and resolve the existing request.');
   if(!runtime)throw new CmsGatewayError(503,'Notification verification delivery is not configured.');
   try{await runtime.run({probeId:before.receipt.probeId,websiteId:c.site,routeId:c.routeId,routeRevision:c.routeRevision});}
   catch{throw new CmsGatewayError(503,'Delivery could not be confirmed. Refresh this verification request before retrying.');}
   const after=await status();
   if(after.receipt.actorId!==before.receipt.actorId||after.receipt.probeId!==before.receipt.probeId||after.receipt.deploymentId!==before.receipt.deploymentId||after.receipt.cmsOrigin!==before.receipt.cmsOrigin||after.state!=='accepted')throw new CmsGatewayError(503,'Delivery could not be confirmed. Refresh this verification request before retrying.');
   return Response.json({result:after},{headers:privateHeaders});
  }
  const parsed=notificationProbeCommand.safeParse(raw);if(!parsed.success)throw new CmsGatewayError(422,'Check the verification request.');const c=parsed.data;
  const value=await call(token,'request_notification_probe',{p_site:c.site,p_route:c.routeId,p_route_revision:c.routeRevision,p_binding_revision:c.bindingRevision,p_request:c.requestId,p_action:c.action});
  return Response.json({result:verifyProbeReceipt(value,c)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
