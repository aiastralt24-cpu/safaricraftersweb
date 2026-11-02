import {recordOwnershipCommand,verifiedRecordOwnership} from './record-ownership.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleRecordOwnership(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=recordOwnershipCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the content ownership request.');const c=parsed.data;
  const args={p_site:c.site,p_record:c.record};
  const result=await call(token,c.action==='read'?'get_record_ownership':'assign_record_owner',c.action==='read'?args:{...args,p_owner:c.owner,p_expected:c.expected});
  return Response.json({result:verifiedRecordOwnership(result,c.site,c.record)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
