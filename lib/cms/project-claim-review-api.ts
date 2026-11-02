import {claimReviewCommand,verifiedClaimReview} from './project-claim-review.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError} from './gateway.ts';
export async function handleClaimReview(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');const parsed=claimReviewCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the claim review request and confirm your evidence review.');const c=parsed.data,args={p_site:c.site,p_record:c.record,p_revision:c.revision,p_claim:c.claim};const result=await call(token,c.action==='review'?'review_project_claim':'approve_project_claim',c.action==='review'?args:{...args,p_assignment:c.assignment,p_snapshot:c.snapshot});return Response.json({result:verifiedClaimReview(result,c.site,c.record,c.revision,c.claim)},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return cmsErrorResponse(error);}
}
