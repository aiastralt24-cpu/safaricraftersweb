import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const commands=z.discriminatedUnion('action',[
 z.object({action:z.literal('tree'),site:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),parent:uuid.nullable().default(null),after:uuid.nullable().default(null),snapshot:z.string().regex(/^[a-f0-9]{32}$/).nullable().default(null)}).strict(),
 z.object({action:z.literal('parents'),site:uuid,record:uuid,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('read'),site:uuid,record:uuid}).strict(),
 z.object({action:z.enum(['move','cancel']),site:uuid,record:uuid,revision:uuid,version:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),parent:uuid.nullable(),requestKey:uuid}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePageHierarchy(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the page move fields.');
  const c=parsed.data,result=c.action==='tree'?await call(token,'list_ordered_page_tree',{p_site:c.site,p_locale:c.locale,p_parent:c.parent,p_after:c.after,p_snapshot:c.snapshot}):c.action==='parents'?await call(token,'list_page_parents',{p_site:c.site,p_record:c.record,p_after:c.after}):c.action==='read'?await call(token,'get_page_hierarchy',{p_site:c.site,p_record:c.record}):await call(token,c.action==='cancel'?'cancel_page_move':'move_page',{p_site:c.site,p_record:c.record,p_revision:c.revision,p_version:c.version,p_parent:c.parent,p_request:c.requestKey});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
