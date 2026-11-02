import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
import {pageUrlProposalSchema,parsePageUrlProposalList,parseUrlSubmissionStatus} from './page-url-proposal.ts';
export {pageUrlProposalSchema} from './page-url-proposal.ts';
const commands=z.discriminatedUnion('action',[
 z.object({action:z.enum(['submission_status','stop_submission']),site:uuid,record:uuid,requestKey:uuid}).strict(),
 z.object({action:z.literal('list'),site:uuid,record:uuid,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('propose'),site:uuid,record:uuid,revision:uuid,path:z.string().min(1).max(500),snapshot:z.string().regex(/^[a-f0-9]{32}$/),redirect:z.enum(['permanent','none']),reason:z.string().max(2000).nullable(),requestKey:uuid}).strict(),
 z.object({action:z.enum(['read','approve','reject','cancel','apply']),site:uuid,proposal:uuid}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePageUrlProposal(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'URL proposals cannot contain query parameters.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the URL proposal fields.');const c=parsed.data;
  if(c.action==='submission_status'||c.action==='stop_submission'){const raw=await call(token,c.action==='submission_status'?'get_page_url_submission':'cancel_page_url_submission',{p_site:c.site,p_record:c.record,p_request:c.requestKey});return Response.json({result:parseUrlSubmissionStatus(raw,c)},{headers:privateHeaders});}
  if(c.action==='list'){const raw=await call(token,'list_page_url_proposals',{p_site:c.site,p_record:c.record,p_after:c.after});return Response.json({result:parsePageUrlProposalList(raw,c)},{headers:privateHeaders});}
  if(c.action!=='propose'&&!('proposal' in c))throw new CmsGatewayError(422,'Invalid proposal command.');
  const raw=c.action==='propose'?await call(token,'propose_page_url',{p_site:c.site,p_record:c.record,p_revision:c.revision,p_path:c.path,p_snapshot:c.snapshot,p_redirect:c.redirect,p_reason:c.reason,p_request:c.requestKey}):c.action==='read'?await call(token,'get_page_url_proposal',{p_site:c.site,p_proposal:c.proposal}):c.action==='apply'?await call(token,'apply_page_url_proposal',{p_site:c.site,p_proposal:c.proposal}):await call(token,'review_page_url_proposal',{p_site:c.site,p_proposal:c.proposal,p_action:c.action});
  const result=pageUrlProposalSchema.parse(raw);
  if(result.site!==c.site||(c.action==='propose'?(result.recordId!==c.record||result.revisionId!==c.revision||result.newPath!==c.path||result.redirectChoice!==c.redirect||result.noRedirectReason!==c.reason):result.proposalId!==c.proposal))throw new CmsGatewayError(502,'The URL proposal response does not match the request. Check the saved proposal before retrying.');
  if(c.action!=='propose'&&c.action!=='read'&&result.status!==({approve:'approved',reject:'rejected',cancel:'cancelled',apply:'applied'} as const)[c.action])throw new CmsGatewayError(502,'The URL proposal review was not confirmed. Read its current status.');
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
