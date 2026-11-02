import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),revision=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),date=z.string().datetime({offset:true});
import {documentFileSchema,documentFileUsageSchema} from './document-files.ts';
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('list'),site:uuid,after:uuid.nullable().default(null),search:z.string().max(200).default('')}).strict(),
 z.object({action:z.literal('usage'),site:uuid,asset:uuid,after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('archive'),site:uuid,asset:uuid,revision,archived:z.boolean()}).strict(),
 z.object({action:z.literal('get'),site:uuid,asset:uuid}).strict(),
 z.object({action:z.literal('rights'),site:uuid,asset:uuid,revision,status:z.enum(['pending','approved','revoked']),evidence:z.string().max(5000),expires:date.nullable()}).strict(),
]);
export async function handleDocumentFileCommand(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the document file fields.');const c=parsed.data;
  if(c.action==='archive'){
   const result=revision.safeParse(await call(token,'archive_document_file',{p_site:c.site,p_asset:c.asset,p_expected:c.revision,p_archive:c.archived}));
   if(!result.success||![c.revision,c.revision+1].includes(result.data))throw new CmsGatewayError(503,'Archive update could not be confirmed. Reload the file before retrying.');
   return Response.json({result:result.data},{headers:privateHeaders});
  }
  if(c.action==='usage'){
   const result=z.array(documentFileUsageSchema).max(50).safeParse(await call(token,'document_file_usage',{p_site:c.site,p_asset:c.asset,p_after:c.after}));
   if(!result.success||new Set(result.data.map(item=>item.recordId)).size!==result.data.length)throw new CmsGatewayError(503,'Document file usage is unavailable.');
   return Response.json({result:result.data},{headers:privateHeaders});
  }
  if(c.action==='rights'){
   if(c.status==='approved'&&(!c.evidence.trim()||c.expires!==null&&Date.parse(c.expires)<=Date.now()))throw new CmsGatewayError(422,'Approval requires evidence and a future expiry date, if specified.');
   const result=revision.safeParse(await call(token,'set_document_file_rights',{p_site:c.site,p_asset:c.asset,p_expected:c.revision,p_status:c.status,p_evidence:c.evidence,p_expires:c.expires}));
   if(!result.success||result.data!==c.revision+1)throw new CmsGatewayError(503,'Rights update could not be confirmed. Reload the file before retrying.');
   return Response.json({result:result.data},{headers:privateHeaders});
  }
  if(c.action==='get'){
   const raw=await call(token,'get_document_file',{p_site:c.site,p_asset:c.asset});if(raw===null)throw new CmsGatewayError(404,'Document file is unavailable.');
   const result=documentFileSchema.safeParse(raw);if(!result.success||result.data.id!==c.asset||!result.data.canManageRights&&result.data.rightsEvidence!==null)throw new CmsGatewayError(503,'Document file details are unavailable.');
   return Response.json({result:result.data},{headers:privateHeaders});
  }
  const result=z.array(documentFileSchema).max(50).safeParse(await call(token,'list_document_files',{p_site:c.site,p_after:c.after,p_search:c.search}));
  if(!result.success||new Set(result.data.map(item=>item.id)).size!==result.data.length||result.data.some(item=>!item.canManageRights&&item.rightsEvidence!==null))throw new CmsGatewayError(503,'Document file list is unavailable.');
  return Response.json({result:result.data},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
