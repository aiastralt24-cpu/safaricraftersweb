import {projectClaimOwnerCommand,verifiedProjectClaimOwners} from './project-claim-owners.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError} from './gateway.ts';
export async function handleProjectClaimOwners(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');const parsed=projectClaimOwnerCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the claim assignment request.');const c=parsed.data;
 const args={p_site:c.site,p_record:c.record,p_revision:c.revision};const result=await call(token,c.action==='list'?'get_project_claim_owners':'assign_project_claim_owner',c.action==='list'?args:{...args,p_claim:c.claim,p_owner:c.owner,p_expected:c.expected});
 return Response.json({result:verifiedProjectClaimOwners(result,c.site,c.record,c.revision)},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return cmsErrorResponse(error);}
}
