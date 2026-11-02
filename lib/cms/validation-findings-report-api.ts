import {findingsQuery,verifiedFindingsReport} from './validation-findings-report.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleFindingsReport(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per finding filter.');const parsed=findingsQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose valid finding filters.');const query=parsed.data;
 return Response.json({result:verifiedFindingsReport(await call(token,'list_validation_findings',{p_site:query.site,p_after:query.after??null,p_severity:query.severity,p_search:query.search,p_limit:20}),query)},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
