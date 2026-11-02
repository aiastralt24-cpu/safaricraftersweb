import {z} from 'zod';
import {guidedMigrationDependencies,planGuidedSafarisMigration} from './guided-safaris-migration.ts';
import {guidedMediaEvidenceSchema,verifyGuidedMigrationMedia} from './guided-migration-media.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
const selection={site:uuid,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(8)};
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),...selection}).strict(),
 z.object({action:z.literal('apply'),...selection,requestKey:uuid,reviewDigest:digest,evidence:guidedMediaEvidenceSchema}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]).refine(value=>value.action==='status'||Boolean(value.recordId)===Boolean(value.expectedRevision));
const resultSchema=z.object({recordId:uuid,revisionId:uuid}).strict();
const receiptSchema=z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:resultSchema}).strict();
const version='guided-migration-review-1';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleGuidedMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the Guided migration target, mappings and review identity.');const c=parsed.data;
  const receipt=async()=>{
   if(c.action==='review')return null;
   const raw=await call(token,'get_guided_migration_result',{p_site:c.site,p_request:c.requestKey});if(raw===null)return null;
   const parsed=receiptSchema.safeParse(raw);if(!parsed.success||parsed.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration receipt is unavailable. Check status before retrying.');return parsed.data;
  };
  if(c.action==='status'){const saved=await receipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  let plan;try{plan=planGuidedSafarisMigration(guidedMigrationDependencies,c.bindings);if(plan.missingMedia.length)throw Error('Incomplete mappings');}catch{throw new CmsGatewayError(422,'Source image mappings are duplicated, stale or unknown.');}
  const requested=c.bindings.map(({assetId,sourceSha256})=>({assetId,sourceSha256}));
  const source=sourceDigest({sourceProof:plan.sourceProof,bindings:c.bindings,payload:plan.previewPayload});
  const reviewHash=(evidence:unknown)=>sourceDigest({version,site:c.site,recordId:c.recordId,expectedRevision:c.expectedRevision,plan,evidence});
  const apply=async(evidence:z.infer<typeof guidedMediaEvidenceSchema>)=>{
   if(c.action!=='apply')throw new Error('Invalid migration action.');
   const manifest={recordId:c.recordId,expectedRevision:c.expectedRevision,payload:plan.previewPayload,bindings:requested,evidence};
   const parsed=resultSchema.safeParse(await call(token,'apply_guided_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:c.reviewDigest,p_manifest:manifest}));
   if(!parsed.success||(c.recordId&&parsed.data.recordId!==c.recordId))throw new CmsGatewayError(503,'Migration result is unavailable. Check status before retrying.');return parsed.data;
  };
  if(c.action==='apply'){
   let original;try{original=verifyGuidedMigrationMedia(requested,c.evidence);}catch{throw new CmsGatewayError(422,'Reviewed media evidence is invalid.');}
   if(!original.verified)throw new CmsGatewayError(422,'Every mapped image must pass verification before applying.');
   if(reviewHash(original.evidence)!==c.reviewDigest)throw new CmsGatewayError(409,'The reviewed content, target or media evidence changed. Review again.');
   const saved=await receipt();
   if(saved){
    if(saved.sourceDigest!==source||saved.reviewDigest!==c.reviewDigest||(c.recordId&&saved.result.recordId!==c.recordId))throw new CmsGatewayError(409,'This request key belongs to another migration review.');
    const result=await apply(original.evidence);if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Migration recovery returned inconsistent results.');
    return Response.json({requestKey:c.requestKey,result,replayed:true,sourceDigest:source,reviewDigest:c.reviewDigest},{headers:privateHeaders});
   }
  }
  let before:Record<string,unknown>|null=null;
  if(c.recordId){
   const record=z.object({id:uuid,type:z.literal('page'),path:z.literal('/guided-bespoke-safaris'),locale:z.literal('en'),currentRevision:uuid,payload:z.record(z.string(),z.unknown()),permissions:z.object({edit:z.boolean()})}).safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.recordId}));
   if(!record.success||record.data.id!==c.recordId||!record.data.permissions.edit)throw new CmsGatewayError(403,'The Guided draft is unavailable or cannot be edited.');
   if(record.data.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'The Guided draft changed. Reload it before reviewing.');before=record.data.payload;
  }else if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'page',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create an Guided page for this website.');
  let checked;try{checked=verifyGuidedMigrationMedia(requested,await call(token,'review_guided_migration_media',{p_site:c.site,p_bindings:requested}));}catch(error){if(error instanceof CmsGatewayError)throw error;throw new CmsGatewayError(503,'Guided migration media evidence is unavailable.');}
  const reviewDigest=reviewHash(checked.evidence);
  if(c.action==='review')return Response.json({version,sourceDigest:source,reviewDigest,before,proposal:plan.previewPayload,verification:checked,applyAvailable:checked.verified,findings:[...plan.findings.filter(item=>!['provider_unverified','delivery_pending'].includes(item.code)),...(!checked.verified?[{code:'media_unavailable',message:'One or more images failed current source, processing or rights checks.'}]:[])],notice:'Apply creates or replaces the Bespoke page draft only. Nothing is published; public delivery remains pending.'},{headers:privateHeaders});
  if(!checked.verified)throw new CmsGatewayError(422,'Mapped images are no longer available for this migration.');
  if(reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'Media evidence changed after review. Review again.');
  return Response.json({requestKey:c.requestKey,result:await apply(checked.evidence),replayed:false,sourceDigest:source,reviewDigest},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
