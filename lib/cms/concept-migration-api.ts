import {conceptMigrationEvidenceSchema,conceptMigrationCanApply} from './concept-migration-evidence.ts';
import {readConceptMigrationReview} from './concept-migration-client.ts';
import {z} from 'zod';
import {conceptMigrationDependencies,conceptMigrationManifestSchema} from './concept-migration-review.ts';
import {planConceptMigration} from './concept-migration.ts';
import {compareConceptMigrationRecords} from './concept-migration-records.ts';
import {reviewHomepageMigrationMedia} from './homepage-migration-media.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const selection={site:uuid,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),mappings:conceptMigrationManifestSchema};
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),...selection}).strict(),
 z.object({action:z.literal('apply'),...selection,requestKey:uuid,reviewDigest:digest,evidence:conceptMigrationEvidenceSchema}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]).refine(value=>value.action==='status'||Boolean(value.recordId)===Boolean(value.expectedRevision));
const resultSchema=z.object({recordId:uuid,revisionId:uuid}).strict();
const receiptSchema=z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:resultSchema}).strict();
const detail=z.object({id:uuid,type:z.string(),path:z.string().nullable(),locale:z.string(),currentRevision:uuid,payload:z.unknown(),permissions:z.object({edit:z.boolean()})}).passthrough();
const version='concept-migration-review-2';
/** Caller-scoped review and recoverable draft application. Never publishes. */
export async function handleConceptMigrationReview(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the concept target, source capture and mappings.');const c=parsed.data;
  const receipt=async()=>{
   if(c.action==='review')return null;
   const raw=await call(token,'get_concept_migration_result',{p_site:c.site,p_request:c.requestKey});if(raw===null)return null;
   const parsed=receiptSchema.safeParse(raw);if(!parsed.success||parsed.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration receipt is unavailable. Check status before retrying.');return parsed.data;
  };
  if(c.action==='status'){const saved=await receipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  let plan;try{plan=planConceptMigration(conceptMigrationDependencies,c.mappings);}catch{throw new CmsGatewayError(422,'Concept source mappings are stale, duplicated, unknown or unsupported.');}
  if(!plan.previewPayload)throw new CmsGatewayError(422,'Map every required concept image, video and content record before comparison.');
  const source=sourceDigest({sourceProof:plan.sourceProof,mappings:c.mappings,payload:plan.previewPayload});
  const reviewHash=(evidence:z.infer<typeof conceptMigrationEvidenceSchema>)=>sourceDigest({version,site:c.site,recordId:c.recordId,expectedRevision:c.expectedRevision,plan,comparison:evidence.recordComparison,mediaVerification:evidence.mediaVerification});
  const apply=async(evidence:z.infer<typeof conceptMigrationEvidenceSchema>)=>{
   if(c.action!=='apply')throw Error('Invalid migration action.');
   const byAsset=new Map([...evidence.mediaVerification.images.map(({sourcePath,...item})=>item),...evidence.mediaVerification.videos.map(video=>video.evidence!)].map(item=>[item.assetId,item]));
   const bindings=plan.media.map(item=>({kind:item.kind,assetId:item.proposedAssetId!,sourceSha256:item.sha256}));
   const records=plan.records.map(item=>({recordId:item.proposedRecordId!,type:item.type,path:item.path,revisionId:evidence.recordComparison.revisions.find(row=>row.recordId===item.proposedRecordId)!.revisionId}));
   const manifest={recordId:c.recordId,expectedRevision:c.expectedRevision,payload:plan.previewPayload,bindings,evidence:bindings.map(item=>byAsset.get(item.assetId)),records};
   const parsed=resultSchema.safeParse(await call(token,'apply_concept_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:c.reviewDigest,p_manifest:manifest}));
   if(!parsed.success||c.recordId&&parsed.data.recordId!==c.recordId)throw new CmsGatewayError(503,'Migration result is unavailable. Check status before retrying.');return parsed.data;
  };
  if(c.action==='apply'){
   try{readConceptMigrationReview({version,sourceDigest:source,reviewDigest:c.reviewDigest,captureDigest:plan.captureDigest,target:{recordId:c.recordId,expectedRevision:c.expectedRevision},proposal:plan.previewPayload,...c.evidence,applyAvailable:conceptMigrationCanApply(c.evidence),findings:[],notice:''},c);}catch{throw new CmsGatewayError(422,'Reviewed concept evidence is incomplete or inconsistent.');}
   if(!conceptMigrationCanApply(c.evidence))throw new CmsGatewayError(422,'All mapped content, images and videos must pass review before applying.');
   if(reviewHash(c.evidence)!==c.reviewDigest)throw new CmsGatewayError(409,'The reviewed target, mappings or evidence changed. Review again.');
   const saved=await receipt();
   if(saved){
    if(saved.sourceDigest!==source||saved.reviewDigest!==c.reviewDigest||c.recordId&&saved.result.recordId!==c.recordId)throw new CmsGatewayError(409,'This request identity belongs to another migration.');
    const result=await apply(c.evidence);if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Migration recovery returned inconsistent results.');
    return Response.json({requestKey:c.requestKey,result,replayed:true,sourceDigest:source,reviewDigest:c.reviewDigest},{headers:privateHeaders});
   }
  }
  if(c.recordId){
   const target=detail.safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.recordId}));
   if(!target.success||target.data.id!==c.recordId||target.data.type!=='page'||target.data.path!=='/concept'||target.data.locale!=='en'||!target.data.permissions.edit)throw new CmsGatewayError(403,'The concept draft is unavailable or cannot be edited.');
   if(target.data.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'The concept draft changed. Reload it before reviewing.');
  }else if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'page',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create a concept for this website.');
  const records=[];
  // Small read batches limit provider pressure. Every response must resolve the
  // requested identity; one unavailable response invalidates the whole review.
  for(let start=0;start<plan.records.length;start+=4){
   const batch=plan.records.slice(start,start+4);
   const results=await Promise.allSettled(batch.map(async binding=>{
    const raw=await call(token,'get_editor_record',{p_site:c.site,p_record:binding.proposedRecordId});
    const parsed=detail.safeParse(raw);
    if(!parsed.success||parsed.data.id!==binding.proposedRecordId||parsed.data.type!==binding.type||parsed.data.locale!=='en'||binding.path!==null&&parsed.data.path!==binding.path)throw new CmsGatewayError(503,'A mapped concept record is unavailable or has an unexpected identity.');
    const {id,type,path,locale,currentRevision,payload}=parsed.data;
    // get_editor_record is an invoker/RLS function filtering both site and ID.
    return {websiteId:c.site,id,type,path,locale,currentRevision,payload};
   }));
   for(const result of results){if(result.status==='rejected')throw result.reason;records.push(result.value);}
  }
  const comparison=compareConceptMigrationRecords(conceptMigrationDependencies,c.mappings,c.site,records);
  let mediaVerification;
  try{mediaVerification=await reviewHomepageMigrationMedia(plan.media,bindings=>call(token,'review_about_migration_media',{p_site:c.site,p_bindings:bindings}),bindings=>call(token,'review_hero_video_migration_media',{p_site:c.site,p_bindings:bindings}));}
  catch(error){if(error instanceof CmsGatewayError)throw error;throw new CmsGatewayError(503,'Concept media provenance or rights evidence is unavailable.');}
  const evidence={recordComparison:comparison,mediaVerification},reviewDigest=reviewHash(evidence),applyAvailable=conceptMigrationCanApply(evidence);
  if(c.action==='review')return Response.json({version,sourceDigest:source,reviewDigest,captureDigest:plan.captureDigest,target:{recordId:c.recordId,expectedRevision:c.expectedRevision},proposal:plan.previewPayload,...evidence,applyAvailable,findings:plan.findings.filter(item=>item.code!=='apply_unavailable'),notice:'Apply creates or replaces a draft only. Review content and presentation before applying; nothing is published.'},{headers:privateHeaders});
  if(!applyAvailable)throw new CmsGatewayError(422,'Mapped content or media is no longer ready. Review the migration again.');
  if(reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'Mapped revisions or media evidence changed after review. Review again.');
  return Response.json({requestKey:c.requestKey,result:await apply(evidence),replayed:false,sourceDigest:source,reviewDigest:c.reviewDigest},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
