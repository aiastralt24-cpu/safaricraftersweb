import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {verifiedTranslationFamily} from './translation-family.ts';
import {translationCreateRequest} from './translation-creation.ts';
const uuid=z.string().uuid(),locale=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('read'),site:uuid,record:uuid}).strict(),
 z.object({action:z.literal('family'),site:uuid,record:uuid,after:uuid.optional()}).strict(),
 translationCreateRequest,
 translationCreateRequest.extend({action:z.literal('cancel_create')}),
 z.object({action:z.literal('review'),site:uuid,record:uuid,revision:uuid,sourceRevision:uuid}).strict(),
]);
export {translationStatusSchema} from './translation-status.ts';
import {translationStatusSchema} from './translation-status.ts';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleTranslations(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the translation fields.');
  const c=parsed.data;
  const raw=c.action==='family'?await call(token,'get_translation_family',{p_site:c.site,p_record:c.record,p_after:c.after??null}):c.action==='create'||c.action==='cancel_create'?await call(token,c.action==='create'?'create_translation_draft':'cancel_translation_creation',{p_site:c.site,p_source:c.source,p_source_revision:c.sourceRevision,p_locale:c.locale,p_path:c.path,p_request:c.requestKey}):c.action==='review'?await call(token,'review_translation',{p_site:c.site,p_record:c.record,p_revision:c.revision,p_source_revision:c.sourceRevision}):await call(token,'get_translation_status',{p_site:c.site,p_record:c.record});
  let result:unknown;
  if(c.action==='family'){try{result=verifiedTranslationFamily(raw,c.record,c.after);}catch{throw new CmsGatewayError(502,'Translation list could not be verified. Refresh it.');}}
  else if(c.action==='create'){const checked=z.object({recordId:uuid,revisionId:uuid}).strict().safeParse(raw);if(!checked.success||checked.data.recordId===c.source)throw new CmsGatewayError(502,'The translation response could not be verified. Retry with the same request key.');result=checked.data;}
  else if(c.action==='cancel_create'){const checked=z.discriminatedUnion('status',[z.object({status:z.literal('cancelled')}).strict(),z.object({status:z.literal('created'),result:z.object({recordId:uuid,revisionId:uuid}).strict()}).strict()]).safeParse(raw);if(!checked.success||(checked.data.status==='created'&&checked.data.result.recordId===c.source))throw new CmsGatewayError(502,'Translation cancellation could not be verified. Retry the same request.');result=checked.data;}
  else if(c.action==='read'&&raw===null)result=null;
  else{const checked=translationStatusSchema.safeParse(raw);if(!checked.success||checked.data.recordId!==c.record||(c.action==='review'&&(checked.data.revisionId!==c.revision||checked.data.currentSourceRevisionId!==c.sourceRevision||checked.data.status!=='current')))throw new CmsGatewayError(502,'The translation status could not be verified. Reload it.');result=checked.data;}
  return Response.json(c.action==='create'||c.action==='cancel_create'?{site:c.site,requestKey:c.requestKey,result}:{result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
