import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),status=z.enum(['reserved','uploaded','processing','ready','rejected','failed','cancelled','expired']);
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('list'),site:uuid}).strict(),
 z.object({action:z.literal('reserve'),site:uuid,requestKey:uuid,filename:z.string().min(5).max(200).regex(/\.pdf$/i).refine(value=>!value.startsWith('.')&&!/[\x00-\x1f\x7f/\\]/.test(value)),mime:z.literal('application/pdf'),bytes:z.number().int().min(1).max(25_000_000)}).strict(),
 z.object({action:z.enum(['status','cancel']),site:uuid,upload:uuid}).strict(),
]);
const reservation=z.object({id:uuid,status,expiresAt:z.string().datetime({offset:true}),filename:z.string(),expectedBytes:z.number().int().min(1).max(25_000_000)}).strict();
const upload=reservation.extend({mime:z.literal('application/pdf'),createdAt:z.string().datetime({offset:true})});
export async function handleDocumentUploadCommand(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args),enabled=process.env.CMS_DOCUMENT_UPLOADS_ENABLED==='true'){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Choose a PDF document no larger than 25 MB.');const c=parsed.data;
  if(c.action==='list'){
   const result=z.array(upload).max(50).safeParse(await call(token,'list_document_uploads',{p_site:c.site}));
   if(!result.success||new Set(result.data.map(item=>item.id)).size!==result.data.length)throw new CmsGatewayError(503,'Document upload status is unavailable.');
   return Response.json({result:result.data,uploadsEnabled:enabled},{headers:privateHeaders});
  }
  if(c.action==='reserve'){
   if(!enabled)throw new CmsGatewayError(503,'PDF document uploads are not enabled yet.');
   const result=reservation.safeParse(await call(token,'reserve_document_upload',{p_site:c.site,p_request:c.requestKey,p_filename:c.filename,p_mime:c.mime,p_bytes:c.bytes}));
   if(!result.success||result.data.filename!==c.filename||result.data.expectedBytes!==c.bytes)throw new CmsGatewayError(503,'Document reservation could not be confirmed. Retry with the same request identity.');
   return Response.json({result:result.data},{headers:privateHeaders});
  }
  // Turning off new uploads must not prevent status recovery or cancellation.
  const current=upload.safeParse(await call(token,'get_upload',{p_site:c.site,p_upload:c.upload}));
  if(!current.success||current.data.id!==c.upload)throw new CmsGatewayError(404,'Document upload is unavailable.');
  if(c.action==='status')return Response.json({result:current.data},{headers:privateHeaders});
  await call(token,'cancel_upload',{p_site:c.site,p_upload:c.upload});
  return Response.json({result:{id:c.upload,status:'cancelled'}},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
