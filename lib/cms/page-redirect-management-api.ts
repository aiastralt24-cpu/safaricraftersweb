import {z} from 'zod';
import {redirectChange,parseRedirectChange,parseRedirectList} from './page-redirect-management.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const commands=z.discriminatedUnion('action',[
 redirectChange.extend({action:z.literal('set_enabled')}),
 z.object({action:z.enum(['list','export']),site:z.string().uuid(),record:z.string().uuid(),after:z.string().refine(isCustomPagePath).nullable().default(null),snapshot:z.string().regex(/^[a-f0-9]{32}$/).nullable().default(null)}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePageRedirectManagement(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'Redirect commands cannot contain query parameters.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the redirect fields.');const c=parsed.data;
  if(c.action==='list'||c.action==='export'){const raw=await call(token,c.action==='export'?'export_page_redirects':'list_page_redirects',{p_site:c.site,p_record:c.record,p_after:c.after,p_snapshot:c.snapshot});return Response.json({result:parseRedirectList(raw,c)},{headers:privateHeaders});}
  if(c.action!=='set_enabled')throw new CmsGatewayError(422,'Invalid redirect command.');
  const raw=await call(token,'set_page_redirect_enabled',{p_site:c.site,p_record:c.record,p_source:c.sourcePath,p_version:c.version,p_enabled:c.enabled,p_request:c.requestKey});
  return Response.json({result:parseRedirectChange(raw,c)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
