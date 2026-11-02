import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export const referenceType=z.enum(['destination','journey','photoExpedition','journalArticle','specialist','testimonial','document','form','product','project','page','navigation','faq','leadership','application','location','certification']);
const uuid=z.string().uuid();
const commands=z.discriminatedUnion('action',[
 z.object({action:z.literal('usage'),site:uuid,record:uuid,revision:uuid,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('list'),site:uuid,type:referenceType,search:z.string().max(200).default(''),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('resolve'),site:uuid,type:referenceType,records:z.array(uuid).max(100).refine(ids=>new Set(ids).size===ids.length)}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleReferenceCommand(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the record selection fields.');
  const c=parsed.data;
  const result=c.action==='usage'?await call(token,'record_reference_usage',{p_site:c.site,p_record:c.record,p_revision:c.revision,p_after:c.after}):c.action==='list'?await call(token,'list_reference_candidates',{p_site:c.site,p_type:c.type,p_search:c.search,p_after:c.after}):await call(token,'resolve_editor_references',{p_site:c.site,p_type:c.type,p_records:c.records});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
