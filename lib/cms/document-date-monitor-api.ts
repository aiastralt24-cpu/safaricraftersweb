import {dateMonitorQuery,verifiedDateMonitor} from './document-date-monitor.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleDocumentDateMonitor(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per document date filter.');
 const parsed=dateMonitorQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose valid document date filters.');
 const query=parsed.data,result=verifiedDateMonitor(await call(token,'list_document_date_monitor',{p_site:query.site,p_after:query.after??null,p_scope:query.scope,p_filter:query.filter,p_limit:20}),query);
 return Response.json({result},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
