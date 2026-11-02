import {formNotificationRouteQuery,verifyFormNotificationRoutes} from './form-notification-routes.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {readBoundedJson} from './editor-api.ts';
export async function handleFormNotificationRoutes(request:Request,call=(token:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,'list_form_notification_routes',args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=formNotificationRouteQuery.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Invalid form recipient request.');const c=parsed.data;
  const result=verifyFormNotificationRoutes(await call(token,{p_site:c.site,p_form:c.formId,p_after:c.after}),c.site,c.formId,c.after);return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
