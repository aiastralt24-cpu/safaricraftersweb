import {z} from 'zod';
import {verifiedSiteRedirectExport} from './site-redirect-export.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleSiteRedirectExport(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'Export requests cannot contain query parameters.');
  const input=z.object({site:z.string().uuid()}).strict().safeParse(await readBoundedJson(request));
  if(!input.success)throw new CmsGatewayError(422,'Choose a valid website to export.');
  return Response.json({result:verifiedSiteRedirectExport(await call(token,'export_site_redirects',{p_site:input.data.site}),input.data.site)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
