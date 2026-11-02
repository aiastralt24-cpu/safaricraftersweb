import {z} from 'zod';
import {verifiedRedirectProposal,verifiedRedirectProposalList} from './redirect-import-approval.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),commands=z.discriminatedUnion('action',[
 z.object({site:uuid,action:z.literal('list'),after:uuid.nullable().default(null)}).strict(),
 z.object({site:uuid,action:z.enum(['get','apply']),proposal:uuid}).strict(),
 z.object({site:uuid,action:z.literal('decide'),proposal:uuid,decision:z.enum(['approved','rejected'])}).strict(),
]);
export async function handleRedirectApproval(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');if(url.search)throw new CmsGatewayError(422,'Use a JSON proposal command.');
 const input=commands.safeParse(await readBoundedJson(request));if(!input.success)throw new CmsGatewayError(422,'Check the redirect proposal fields.');const c=input.data;
 const result=c.action==='list'?verifiedRedirectProposalList(await call(token,'list_redirect_import_proposals',{p_site:c.site,p_after:c.after}),c.site,c.after):verifiedRedirectProposal(await call(token,c.action==='get'?'get_redirect_import_proposal':c.action==='apply'?'apply_redirect_import':'decide_redirect_import_proposal',{p_site:c.site,p_proposal:c.proposal,...(c.action==='decide'?{p_decision:c.decision}:{})}),c.site,c.proposal);
 if(c.action==='decide'&&'status' in result&&result.status!==c.decision)throw new CmsGatewayError(503,'The decision was not confirmed. Reload the proposal before retrying.');
 if(c.action==='apply'&&'status' in result&&result.status!=='applied')throw new CmsGatewayError(503,'Application was not confirmed. Reload the proposal before retrying.');
 return Response.json({result},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
