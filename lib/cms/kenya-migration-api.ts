import {z} from 'zod';
import {planKenyaMigration,kenyaMigrationDependencies} from './kenya-migration.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),asset=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const evidenceItem=z.object({assetId:asset,sourceSha256:hash,sourceMatches:z.boolean(),revision:z.number().int().positive().nullable(),processedSha256:hash.nullable(),available:z.boolean()}).strict();
const evidenceSchema=z.array(evidenceItem).length(8);
const selection={site:uuid,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().max(500),sourceSha256:hash,assetId:asset}).strict()).length(8)};
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),...selection}).strict(),
 z.object({action:z.literal('apply'),...selection,requestKey:uuid,reviewDigest:hash,evidence:evidenceSchema}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]).refine(c=>c.action==='status'||Boolean(c.recordId)===Boolean(c.expectedRevision));
const resultSchema=z.object({recordId:uuid,revisionId:uuid}).strict();
const receiptSchema=z.object({requestKey:uuid,sourceDigest:hash,reviewDigest:hash,createdAt:z.string().datetime({offset:true}),result:resultSchema}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
/** Caller-scoped review, atomic draft save and immutable receipt recovery. Never publishes. */
export async function handleKenyaMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the Kenya migration target and eight original image mappings.');const c=parsed.data;
  const receipt=async()=>{
   if(c.action==='review')return null;
   const raw=await call(token,'get_kenya_migration_result',{p_site:c.site,p_request:c.requestKey});if(raw===null)return null;
   const checked=receiptSchema.safeParse(raw);if(!checked.success||checked.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Kenya migration receipt is unavailable. Check status before retrying.');return checked.data;
  };
  if(c.action==='status'){const saved=await receipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  let plan;try{plan=planKenyaMigration(kenyaMigrationDependencies,c.bindings);if(plan.missingMedia.length)throw Error('Missing bindings');}catch{throw new CmsGatewayError(422,'Kenya image mappings are incomplete, duplicated, stale or unknown.');}
  const bindings=c.bindings.map(({assetId,sourceSha256})=>({assetId,sourceSha256}));
  const source=sourceDigest({sourceProof:plan.sourceProof,bindings:c.bindings,payload:plan.previewPayload}),version='kenya-migration-review-1';
  const reviewHash=(verification:unknown)=>sourceDigest({version,site:c.site,recordId:c.recordId,expectedRevision:c.expectedRevision,source,verification});
  const apply=async(evidence:z.infer<typeof evidenceSchema>)=>{
   if(c.action!=='apply')throw Error('Invalid migration action.');
   const result=resultSchema.safeParse(await call(token,'apply_kenya_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:c.reviewDigest,p_manifest:{recordId:c.recordId,expectedRevision:c.expectedRevision,payload:plan.previewPayload,bindings,evidence}}));
   if(!result.success||(c.recordId&&result.data.recordId!==c.recordId)||result.data.revisionId===c.expectedRevision)throw new CmsGatewayError(503,'Kenya migration result is unavailable. Check status before retrying.');return result.data;
  };
  if(c.action==='apply'){
   if(c.evidence.some((e,i)=>e.assetId!==bindings[i].assetId||e.sourceSha256!==bindings[i].sourceSha256||!e.available||!e.sourceMatches||!e.revision||!e.processedSha256))throw new CmsGatewayError(422,'All eight reviewed images must pass verification before applying.');
   const original={verified:true,evidence:c.evidence,unavailable:[]};
   if(reviewHash(original)!==c.reviewDigest)throw new CmsGatewayError(409,'The reviewed content, target or image evidence changed. Review again.');
   const saved=await receipt();
   if(saved){
    if(saved.sourceDigest!==source||saved.reviewDigest!==c.reviewDigest||(c.recordId&&saved.result.recordId!==c.recordId))throw new CmsGatewayError(409,'This request key belongs to another Kenya migration review.');
    // The transaction rechecks current authority and exact manifest even on replay.
    const result=await apply(c.evidence);if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Kenya migration recovery returned inconsistent results.');
    return Response.json({requestKey:c.requestKey,result,replayed:true,sourceDigest:source,reviewDigest:c.reviewDigest},{headers:privateHeaders});
   }
  }
  let before:Record<string,unknown>|null=null;
  if(c.recordId){
   const record=z.object({id:uuid,type:z.literal('page'),path:z.literal('/destinations/kenya'),locale:z.literal('en'),currentRevision:uuid,payload:z.record(z.string(),z.unknown()),permissions:z.object({edit:z.boolean()})}).safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.recordId}));
   if(!record.success||record.data.id!==c.recordId||!record.data.permissions.edit)throw new CmsGatewayError(403,'The Kenya draft is unavailable or cannot be edited.');
   if(record.data.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'The Kenya draft changed. Reload it before review.');before=record.data.payload;
  }else if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'page',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create a Kenya page for this website.');

  // Reuse the existing caller-scoped image-1 processing/rights check within its
  // two-image limit. The apply transaction rechecks all eight under locks.
  const batches=await Promise.all([0,2,4,6].map(async offset=>{
   const requested=bindings.slice(offset,offset+2),raw=await call(token,'review_contact_migration_media',{p_site:c.site,p_bindings:requested});
   const checked=z.array(evidenceItem).length(2).safeParse(raw);
   if(!checked.success||checked.data.some((e,i)=>e.assetId!==requested[i].assetId||e.sourceSha256!==requested[i].sourceSha256||(e.available&&(!e.sourceMatches||!e.revision||!e.processedSha256))))throw new CmsGatewayError(503,'Kenya image evidence is unavailable.');
   return checked.data;
  }));
  const evidence=batches.flat(),verification={verified:evidence.every(e=>e.available),evidence,unavailable:evidence.filter(e=>!e.available).map(e=>e.assetId)};
  const reviewDigest=reviewHash(verification);
  if(c.action==='apply'){
   if(!verification.verified)throw new CmsGatewayError(422,'Images are no longer available. Review again.');
   if(reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'Image evidence changed after review. Review again.');
   return Response.json({requestKey:c.requestKey,result:await apply(verification.evidence),replayed:false,sourceDigest:source,reviewDigest},{headers:privateHeaders});
  }
  return Response.json({version,selection:c,sourceDigest:source,reviewDigest,before,proposal:plan.previewPayload,metadata:plan.metadata,verification,applyAvailable:verification.verified,findings:[...plan.findings.filter(f=>f.code!=='delivery_pending'),...(!verification.verified?[{code:'media_unavailable',message:'Mapped images failed current source, processing or usage-rights checks.'}]:[])],notice:'Apply saves the reviewed Kenya content as a draft only. Image evidence is rechecked under database locks. Nothing is published.'},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
