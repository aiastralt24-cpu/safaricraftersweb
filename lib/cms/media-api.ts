import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),asset=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),revision=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('list'),site:uuid,after:asset.nullable().default(null),search:z.string().max(200).default('')}).strict(),
 z.object({action:z.literal('get'),site:uuid,asset}).strict(),
 z.object({action:z.literal('usage'),site:uuid,asset,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('archive'),site:uuid,asset,revision,archived:z.boolean()}).strict(),
 z.object({action:z.literal('edit'),site:uuid,asset,revision,title:z.string().trim().min(1).max(200),description:z.string().max(5000),alt:z.string().max(500),caption:z.string().max(2000),folder:z.string().max(200),tags:z.array(z.string().trim().min(1).max(80)).max(50)}).strict(),
 z.object({action:z.literal('rights'),site:uuid,asset,revision,status:z.enum(['pending','approved','revoked']),evidence:z.string().max(5000),expires:z.string().datetime({offset:true}).nullable()}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
const rpc:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleMediaCommand(request:Request,call:Rpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the image metadata fields.');
  const c=parsed.data;let result;
  if(c.action==='list')result=await call(token,'list_media',{p_site:c.site,p_after:c.after,p_search:c.search});
  else if(c.action==='get')result=await call(token,'get_media',{p_site:c.site,p_asset:c.asset});
  else if(c.action==='usage')result=await call(token,'media_usage',{p_site:c.site,p_asset:c.asset,p_after:c.after});
  else if(c.action==='archive')result=await call(token,'archive_media',{p_site:c.site,p_asset:c.asset,p_expected:c.revision,p_archive:c.archived});
  else if(c.action==='rights')result=await call(token,'set_media_rights',{p_site:c.site,p_asset:c.asset,p_expected:c.revision,p_status:c.status,p_evidence:c.evidence,p_expires:c.expires});
  else result=await call(token,'edit_media',{p_site:c.site,p_asset:c.asset,p_expected:c.revision,p_title:c.title,p_description:c.description,p_alt:c.alt,p_caption:c.caption,p_folder:c.folder,p_tags:c.tags});
  if(c.action==='get'&&!result)throw new CmsGatewayError(404,'Image is unavailable.');
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
