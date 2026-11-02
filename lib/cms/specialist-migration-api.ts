import {z} from 'zod';
import {specialistSchema} from './specialists.ts';
import {planSpecialistMigration} from './specialist-migration.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const sourceRecord=z.record(z.string(),z.unknown());
const command=z.object({action:z.enum(['review','apply']),site:z.string().uuid(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),source:z.object({specialists:z.array(sourceRecord).min(1).max(25),journeys:z.array(sourceRecord).max(10000),expeditions:z.array(sourceRecord).max(10000)}).strict(),mappings:z.record(z.string(),z.unknown()).default({}),requestKey:z.string().uuid().optional(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().refine(c=>c.action==='review'||Boolean(c.requestKey&&c.reviewDigest),'Apply requires a reviewed digest and request key.');
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(z.object({recordId:z.string().uuid(),type:z.enum(['journey','photoExpedition']),available:z.boolean(),locale:z.string().optional()}).strict()).max(500)}).strict();
const resultsSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^specialist_[a-f0-9]{64}$/)}).strict()).min(1).max(25).refine(items=>new Set(items.map(item=>item.recordId)).size===items.length&&new Set(items.map(item=>item.revisionId)).size===items.length&&new Set(items.map(item=>item.sourceKey)).size===items.length);
const receiptSchema=z.object({requestKey:z.string().uuid(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.string().datetime({offset:true}),result:resultsSchema}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleSpecialistMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const input=await readBoundedJson(request);
  if(input&&typeof input==='object'&&input.action==='status'){
   const status=z.object({action:z.literal('status'),site:z.string().uuid(),requestKey:z.string().uuid()}).strict().parse(input);
   const value=await call(token,'get_specialist_migration_result',{p_site:status.site,p_request:status.requestKey});
   if(value===null)return Response.json({status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});
   const receipt=receiptSchema.safeParse(value);if(!receipt.success||receipt.data.requestKey!==status.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
   return Response.json({status:'complete',...receipt.data},{headers:privateHeaders});
  }
  const c=command.parse(input),plan=planSpecialistMigration(c.source,c.mappings);
  const manifest=()=>plan.candidates.map(item=>({sourceKey:item.sourceKey,source:item.source,relatedSources:item.relatedSources,mappings:c.mappings,payload:specialistSchema.parse(item.payload),locale:c.locale}));
  const validateResult=(raw:unknown)=>{const result=resultsSchema.safeParse(raw);if(!result.success||result.data.length!==plan.count||result.data.some(item=>!plan.candidates.some(candidate=>candidate.sourceKey===item.sourceKey)))throw new CmsGatewayError(503,'Migration receipt is unavailable. Check the request status before retrying.');return result.data;};
  if(c.action==='apply'){
   const value=await call(token,'get_specialist_migration_result',{p_site:c.site,p_request:c.requestKey});
   if(value!==null){
    const receipt=receiptSchema.safeParse(value);if(!receipt.success||receipt.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    if(receipt.data.sourceDigest!==plan.sourceDigest||receipt.data.reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'This request key belongs to a different migration review.');
    const result=validateResult(await call(token,'apply_specialist_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:c.reviewDigest,p_items:manifest()}));
    if(sourceDigest(result)!==sourceDigest(receipt.data.result))throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    return Response.json({result,replayed:true},{headers:privateHeaders});
   }
  }
  const assets=[...new Set(plan.candidates.flatMap(({payload})=>[payload.image?.assetId,payload.video?.poster.assetId].filter((id):id is string=>Boolean(id))))];
  const refs=new Map<string,{recordId:string;type:'journey'|'photoExpedition'}>();
  for(const {payload} of plan.candidates)for(const [field,type] of [['journeys','journey'],['expeditions','photoExpedition']] as const)for(const ref of payload[field])refs.set(`${type}:${ref.recordId}`,{recordId:ref.recordId,type});
  const references=[...refs.values()];if(assets.length>500||references.length>500)throw new CmsGatewayError(422,'Review a smaller batch of profiles.');
  const checked=evidenceSchema.safeParse(await call(token,'review_specialist_migration_links',{p_site:c.site,p_assets:assets,p_references:references}));
  if(!checked.success)throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  const evidence=checked.data;
  if(evidence.assets.length!==assets.length||evidence.references.length!==references.length||evidence.assets.some((item,i)=>item.assetId!==assets[i])||evidence.references.some((item,i)=>item.recordId!==references[i].recordId||item.type!==references[i].type))throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  for(const candidate of plan.candidates){
   const fail=(field:string,message:string)=>{candidate.canSaveDraft=false;candidate.issues.push({field,severity:'error',message});};
   for(const [field,picture] of [['image',candidate.payload.image],['video.poster',candidate.payload.video?.poster]] as const)if(picture&&!evidence.assets.find(item=>item.assetId===picture.assetId)?.available)fail(field,'The mapped image is unavailable or lacks approved processed-image rights for this website.');
   for(const [field,type] of [['journeys','journey'],['expeditions','photoExpedition']] as const)candidate.payload[field].forEach((ref,index)=>{const item=evidence.references.find(item=>item.recordId===ref.recordId&&item.type===type);if(!item?.available||item.locale!==c.locale)fail(`${field}.${index}`,'The mapped trip is unavailable, has the wrong type or belongs to another language.');});
   if(candidate.payload.video)fail('video','Film and caption availability checks are not connected yet. Retain this source for a later migration.');
  }
  plan.readyDrafts=plan.candidates.filter(item=>item.canSaveDraft).length;
  const reviewDigest=sourceDigest({version:'specialist-migration-review-1',site:c.site,locale:c.locale,mappings:c.mappings,plan,evidence});
  const applyAvailable=plan.readyDrafts===plan.count&&!plan.unmatchedAssignments.length&&Object.values(plan.unusedMappings).every(items=>items.length===0);
  if(c.action==='review')return Response.json({plan,reviewDigest,applyAvailable,verification:{media:true,references:true,film:false}},{headers:privateHeaders});
  if(c.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'Review the current source, mappings and availability before importing.');
  if(!applyAvailable)throw new CmsGatewayError(422,'Resolve all migration errors, unmatched assignments and unused mappings before importing.');
  const result=validateResult(await call(token,'apply_specialist_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:reviewDigest,p_items:manifest()}));
  return Response.json({result,replayed:false},{headers:privateHeaders});
 }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Check the specialist migration source and mappings.'},{status:422,headers:privateHeaders});return cmsErrorResponse(error);}
}
