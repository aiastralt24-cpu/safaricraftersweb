import {z} from 'zod';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.object({site:z.string().uuid(),request:z.string().uuid()}).strict();
const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleDeliveryRetry(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Select the release to retry.');
  const target=parsed.data,raw=await call(token,'retry_release_delivery',{p_site:target.site,p_request:target.request});
  const result=command.extend({retried:z.number().int().min(0).max(50)}).safeParse(raw);
  if(!result.success||result.data.site.toLowerCase()!==target.site.toLowerCase()||result.data.request.toLowerCase()!==target.request.toLowerCase())throw new CmsGatewayError(503,'Retry confirmation is unavailable. Refresh delivery status before trying again.');
  return Response.json({result:result.data},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
