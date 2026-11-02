import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {pageOrderCommand,parsePageOrder,parsePageOrderResult} from './page-order.ts';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePageOrder(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'Page order requests cannot contain query parameters.');
  const parsed=pageOrderCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the page order fields.');
  const c=parsed.data,args={p_site:c.site,p_locale:c.locale,p_parent:c.parent};
  const raw=c.action==='read'?await call(token,'get_page_sibling_order',args):await call(token,'set_page_sibling_order',{...args,p_snapshot:c.snapshot,p_ids:c.ids,p_request:c.requestKey});
  const result=c.action==='read'?parsePageOrder(raw,c):parsePageOrderResult(raw,c);
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
