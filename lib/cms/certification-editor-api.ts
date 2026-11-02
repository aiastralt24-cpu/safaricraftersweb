import {z} from 'zod';
import {certificationSaveCommand,certificationPath} from './certifications.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const receipt=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid()}).strict();
export async function handleCertificationSave(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const input=await readBoundedJson(request);
  if(input&&typeof input==='object'&&input.action==='cancel_create'){
   const cancel=z.object({action:z.literal('cancel_create'),site:z.string().uuid(),requestKey:z.string().uuid()}).strict().safeParse(input);
   if(!cancel.success)throw new CmsGatewayError(422,'Check the Certification recovery request.');
   const c=cancel.data,raw=await call(token,'cancel_draft_creation',{p_site:c.site,p_request:c.requestKey,p_type:'certification'});
   const result=z.discriminatedUnion('status',[z.object({status:z.literal('cancelled')}).strict(),z.object({status:z.literal('created'),result:receipt}).strict()]).safeParse(raw);
   if(!result.success)throw new CmsGatewayError(503,'Certification cancellation could not be verified. Keep the recovery request.');
   return Response.json({site:c.site,requestKey:c.requestKey,result:result.data},{headers:privateHeaders});
  }
  const parsed=certificationSaveCommand.safeParse(input);if(!parsed.success)throw new CmsGatewayError(422,'Check the Certification fields before saving.');const c=parsed.data;
  if(c.record){const stored=await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}) as Record<string,unknown>|null;
   if(!stored||stored.id!==c.record||stored.type!=='certification')throw new CmsGatewayError(404,'Certification is unavailable.');
   if(stored.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'This Certification changed. Keep your edits and reload its latest revision.');
   if(stored.path!==certificationPath(c.payload.slug)||stored.locale!==c.locale)throw new CmsGatewayError(422,'Certification identity or language does not match.');
  }
  const shared={p_site:c.site,p_type:'certification',p_path:certificationPath(c.payload.slug),p_title:c.payload.title,p_payload:c.payload,p_locale:c.locale};
  const raw=await call(token,c.record?'save_draft':'create_draft_once',c.record?{...shared,p_record:c.record,p_expected:c.expectedRevision}:{...shared,p_request:c.requestKey});
  const result=receipt.safeParse(raw);if(!result.success||c.record&&result.data.recordId!==c.record)throw new CmsGatewayError(503,'The save result could not be verified. Keep the request identity before retrying.');
  return Response.json(c.record?{result:result.data}:{site:c.site,requestKey:c.requestKey,result:result.data},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
