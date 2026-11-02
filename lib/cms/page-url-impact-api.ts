import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {pageUrlImpactCommand,parsePageUrlImpact} from './page-url-impact.ts';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePageUrlImpact(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'URL review requests cannot contain query parameters.');
  const parsed=pageUrlImpactCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the proposed page URL.');
  const c=parsed.data,raw=await call(token,'review_page_url',{p_site:c.site,p_record:c.record,p_revision:c.revision,p_path:c.path,p_after:c.after});
  return Response.json({result:parsePageUrlImpact(raw,c)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
