import {z} from 'zod';
import {planMiceMigration,miceMigrationDependencies} from './mice-migration.ts';
import {miceMediaEvidenceSchema,verifyMiceMigrationMedia} from './mice-migration-media.ts';
import {verifyMiceMigrationForm} from './mice-migration-form.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
const selection={site:uuid,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),formId:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(2)};
const formEvidenceSchema=z.object({recordId:uuid,revisionId:uuid,locale:z.literal('en'),available:z.literal(true)}).strict();
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),...selection}).strict(),
 z.object({action:z.literal('apply'),...selection,formId:uuid,requestKey:uuid,reviewDigest:digest,evidence:miceMediaEvidenceSchema,formEvidence:formEvidenceSchema}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]).refine(c=>c.action==='status'||Boolean(c.recordId)===Boolean(c.expectedRevision));
const resultSchema=z.object({recordId:uuid,revisionId:uuid}).strict();
const receiptSchema=z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:resultSchema}).strict();
const version='mice-migration-review-1';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
/** Caller-scoped review, atomic draft application and immutable receipt recovery. No publication. */
export async function handleMiceMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the MICE migration target and original image mappings.');const c=parsed.data;
  const receipt=async()=>{
   if(c.action==='review')return null;
   const raw=await call(token,'get_mice_migration_result',{p_site:c.site,p_request:c.requestKey});if(raw===null)return null;
   const parsed=receiptSchema.safeParse(raw);if(!parsed.success||parsed.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration receipt is unavailable. Check status before retrying.');return parsed.data;
  };
  if(c.action==='status'){const saved=await receipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  let plan;try{plan=planMiceMigration(miceMigrationDependencies,c.bindings,c.formId);if(plan.missingMedia.length)throw Error('Incomplete mappings');}catch{throw new CmsGatewayError(422,'MICE source image mappings are incomplete, duplicated, stale or unknown.');}
  const bindings=c.bindings.map(({assetId,sourceSha256})=>({assetId,sourceSha256}));
  const source=sourceDigest({sourceProof:plan.sourceProof,bindings:c.bindings,payload:plan.previewPayload});
  const reviewHash=(verification:unknown,formEvidence:unknown)=>sourceDigest({version,site:c.site,recordId:c.recordId,expectedRevision:c.expectedRevision,source,verification,formEvidence});
  const apply=async(evidence:z.infer<typeof miceMediaEvidenceSchema>,formEvidence:z.infer<typeof formEvidenceSchema>)=>{
   if(c.action!=='apply')throw Error('Invalid migration action.');
   const manifest={recordId:c.recordId,expectedRevision:c.expectedRevision,payload:plan.previewPayload,bindings,evidence,formBinding:{recordId:formEvidence.recordId,revisionId:formEvidence.revisionId,locale:formEvidence.locale}};
   const result=resultSchema.safeParse(await call(token,'apply_mice_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:c.reviewDigest,p_manifest:manifest}));
   if(!result.success||(c.recordId&&result.data.recordId!==c.recordId))throw new CmsGatewayError(503,'Migration result is unavailable. Check status before retrying.');return result.data;
  };
  if(c.action==='apply'){
   let original;try{original=verifyMiceMigrationMedia(bindings,c.evidence);verifyMiceMigrationForm(c.formId,c.formEvidence);}catch{throw new CmsGatewayError(422,'Reviewed image or corporate form evidence is invalid.');}
   if(!original.verified)throw new CmsGatewayError(422,'Both original images must pass verification before applying.');
   if(reviewHash(original,c.formEvidence)!==c.reviewDigest)throw new CmsGatewayError(409,'The reviewed content, target or evidence changed. Review again.');
   const saved=await receipt();
   if(saved){
    if(saved.sourceDigest!==source||saved.reviewDigest!==c.reviewDigest||(c.recordId&&saved.result.recordId!==c.recordId))throw new CmsGatewayError(409,'This request key belongs to another migration review.');
    // Reenter the transaction for current write authority and exact-manifest checking.
    const result=await apply(original.evidence,c.formEvidence);if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Migration recovery returned inconsistent results.');
    return Response.json({requestKey:c.requestKey,result,replayed:true,sourceDigest:source,reviewDigest:c.reviewDigest},{headers:privateHeaders});
   }
  }
  let before:Record<string,unknown>|null=null;
  if(c.recordId){
   const record=z.object({id:uuid,type:z.literal('page'),path:z.literal('/mice'),locale:z.literal('en'),currentRevision:uuid,payload:z.record(z.string(),z.unknown()),permissions:z.object({edit:z.boolean()})}).safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.recordId}));
   if(!record.success||record.data.id!==c.recordId||!record.data.permissions.edit)throw new CmsGatewayError(403,'The MICE draft is unavailable or cannot be edited.');
   if(record.data.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'The MICE draft changed. Reload it before review.');before=record.data.payload;
  }else if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'page',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create a MICE page for this website.');
  let verification;try{verification=verifyMiceMigrationMedia(bindings,await call(token,'review_contact_migration_media',{p_site:c.site,p_bindings:bindings}));}catch(error){if(error instanceof CmsGatewayError)throw error;throw new CmsGatewayError(503,'MICE image evidence is unavailable.');}
  let formEvidence=null;
  if(c.formId){try{formEvidence=verifyMiceMigrationForm(c.formId,await call(token,'review_mice_migration_form',{p_site:c.site,p_form:c.formId}));}catch(error){if(error instanceof CmsGatewayError)throw error;throw new CmsGatewayError(503,'Published corporate form evidence is unavailable.');}}
  const reviewDigest=reviewHash(verification,formEvidence);
  if(c.action==='apply'){
   if(!verification.verified||!formEvidence?.available)throw new CmsGatewayError(422,'Images or the published corporate form are no longer available. Review again.');
   if(reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'Image or form evidence changed after review. Review again.');
   return Response.json({requestKey:c.requestKey,result:await apply(verification.evidence,formEvidenceSchema.parse(formEvidence)),replayed:false,sourceDigest:source,reviewDigest},{headers:privateHeaders});
  }
  return Response.json({version,selection:c,sourceDigest:source,reviewDigest,before,proposal:plan.previewPayload,metadata:plan.metadata,verification,formEvidence,applyAvailable:verification.verified&&Boolean(formEvidence?.available),findings:[...plan.findings.filter(f=>!['corporate_form_review','delivery_pending'].includes(f.code)),...(!formEvidence?.available?[{code:'corporate_form_unavailable',message:'Select a compatible, published English corporate form before applying this migration.'}]:[{code:'corporate_form_verified',message:'The selected published corporate form passed current field-mapping checks. Enquiries use the CMS inbox; email notifications remain disabled.'}]),...(!verification.verified?[{code:'media_unavailable',message:'Mapped images failed current source, processing or rights checks.'}]:[])],notice:'Apply saves the reviewed MICE page as a draft only. Image and published-form evidence are rechecked under database locks. Nothing is published.'},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
