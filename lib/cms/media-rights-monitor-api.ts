import {mediaRightsQuery,verifiedMediaRights,verifiedRightsKind} from './media-rights-monitor.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleMediaRightsMonitor(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args),kind:'media'|'pdf'='media'){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per media rights filter.');const parsed=mediaRightsQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose valid media rights filters.');const query=parsed.data;
 return Response.json({result:verifiedRightsKind(verifiedMediaRights(await call(token,kind==='pdf'?'list_pdf_rights_monitor':'list_media_rights_monitor',{p_site:query.site,p_after:query.after??null,p_filter:query.filter,p_limit:20}),query),kind)},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
