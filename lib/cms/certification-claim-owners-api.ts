import {projectClaimOwnerCommand,verifiedProjectClaimOwners} from './project-claim-owners.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError} from './gateway.ts';
export async function handleCertificationClaimOwners(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');const parsed=projectClaimOwnerCommand.safeParse(await readBoundedJson(request));if(!parsed.success||(parsed.data.action==='assign'&&parsed.data.claim!==parsed.data.record))throw new CmsGatewayError(422,'Check the claim assignment request.');const c=parsed.data;
 const args={p_site:c.site,p_record:c.record,p_revision:c.revision};const result=await call(token,c.action==='list'?'get_certification_claim_owners':'assign_certification_claim_owner',c.action==='list'?args:{...args,p_claim:c.claim,p_owner:c.owner,p_expected:c.expected});
 const checked=verifiedProjectClaimOwners(result,c.site,c.record,c.revision);if(checked.claims.length!==1||checked.claims[0].claimId!==c.record)throw new CmsGatewayError(503,'Certification claim identity could not be verified.');
 return Response.json({result:checked},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return cmsErrorResponse(error);}
}
