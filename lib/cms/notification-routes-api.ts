import {z} from 'zod';
import {notificationRouteCommand,verifyNotificationRouteReceipt,verifyNotificationRoutes,verifyNotificationRouteResolution,verifyNotificationRouteHistory} from './notification-routes.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const list=z.object({action:z.literal('list'),site:z.string().uuid(),after:z.string().uuid().nullable().default(null)}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleNotificationRoutes(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const raw=await readBoundedJson(request),query=list.safeParse(raw);
  if(query.success){const c=query.data;return Response.json({result:verifyNotificationRoutes(await call(token,'list_notification_routes',{p_site:c.site,p_after:c.after}),c.site,c.after)},{headers:privateHeaders});}
  const history=z.object({action:z.literal('history'),site:z.string().uuid(),routeId:z.string().uuid(),after:z.string().uuid().nullable().default(null)}).strict().safeParse(raw);
  if(history.success){const c=history.data,result=await call(token,'list_notification_route_history',{p_site:c.site,p_route:c.routeId,p_after:c.after});if(result===null)throw new CmsGatewayError(404,'Recipient route is unavailable.');return Response.json({result:verifyNotificationRouteHistory(result,c.site,c.routeId,c.after)},{headers:privateHeaders});}
  const resolution=z.object({action:z.literal('resolve'),command:notificationRouteCommand}).strict().safeParse(raw);
  if(resolution.success){const c=resolution.data.command;const result=await call(token,'cancel_notification_route_request',{p_site:c.site,p_route:c.routeId,p_expected:c.expected,p_request:c.requestId,p_action:c.action,p_payload:c.payload});return Response.json({result:verifyNotificationRouteResolution(result,c)},{headers:privateHeaders});}
  const parsed=notificationRouteCommand.safeParse(raw);if(!parsed.success)throw new CmsGatewayError(422,'Check the notification recipient fields.');const c=parsed.data;
  const result=await call(token,'manage_notification_route',{p_site:c.site,p_route:c.routeId,p_expected:c.expected,p_request:c.requestId,p_action:c.action,p_payload:c.payload});
  return Response.json({result:verifyNotificationRouteReceipt(result,c)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
