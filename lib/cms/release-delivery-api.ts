import {z} from 'zod';
import {summarizeReleaseDelivery} from './release-delivery-status.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const query=z.object({site:z.string().uuid(),request:z.string().uuid()}).strict();
const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleReleaseDeliveryRead(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Select one release.');
  const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Select a website and release request.');
  const target=parsed.data,raw=await call(token,'get_release_delivery_status',{p_site:target.site,p_request:target.request});
  if(raw===null)throw new CmsGatewayError(404,'Release status is unavailable.');
  let result;try{result=summarizeReleaseDelivery(raw);if(result.result.site.toLowerCase()!==target.site.toLowerCase()||result.result.request.toLowerCase()!==target.request.toLowerCase())throw Error();}catch{throw new CmsGatewayError(503,'Release delivery information could not be verified.');}
  return Response.json(result,{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
