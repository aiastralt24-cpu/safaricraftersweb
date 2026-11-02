import {z} from 'zod';
import {planPhotoExpeditionMigration} from './photo-expedition-migration.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {photoExpeditionSchema} from './photo-expeditions.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.object({action:z.enum(['review','apply']),site:z.string().uuid(),locale:z.literal('en'),source:z.array(z.record(z.string(),z.unknown())).min(1).max(25),mappings:z.record(z.string(),z.unknown()).default({}),requestKey:z.string().uuid().optional(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().refine(c=>c.action==='review'||Boolean(c.requestKey&&c.reviewDigest),'Apply requires the reviewed digest and a request key.');
const resultsSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^snapshot:[a-f0-9]{64}$/)}).strict()).min(1).max(25).refine(items=>['recordId','revisionId','sourceKey'].every(key=>new Set(items.map(item=>item[key as keyof typeof item])).size===items.length));
const receiptSchema=z.object({requestKey:z.string().uuid(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.string().datetime({offset:true}),result:resultsSchema}).strict();
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(z.object({recordId:z.string().uuid(),type:z.enum(['specialist','form']),available:z.boolean(),locale:z.string().optional()}).strict()).max(500)}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePhotoExpeditionMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const input=await readBoundedJson(request);
  if(input&&typeof input==='object'&&input.action==='status'){
   const status=z.object({action:z.literal('status'),site:z.string().uuid(),requestKey:z.string().uuid()}).strict().parse(input);
   const value=await call(token,'get_expedition_migration_result',{p_site:status.site,p_request:status.requestKey});
   if(value===null)return Response.json({status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});
   const receipt=receiptSchema.safeParse(value);if(!receipt.success||receipt.data.requestKey!==status.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
   return Response.json({status:'complete',...receipt.data},{headers:privateHeaders});
  }
  const c=command.parse(input),plan=planPhotoExpeditionMigration(c.source,c.mappings);
  const manifest=()=>plan.candidates.map(item=>({sourceKey:item.sourceKey,source:item.source,mappings:item.mapping,payload:photoExpeditionSchema.parse(item.payload),locale:c.locale}));
  const apply=async()=>{
   const raw=await call(token,'apply_expedition_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:c.reviewDigest,p_items:manifest()});
   const result=resultsSchema.safeParse(raw);if(!result.success||result.data.length!==plan.count||result.data.some(item=>!plan.candidates.some(candidate=>candidate.sourceKey===item.sourceKey)))throw new CmsGatewayError(503,'Migration receipt is unavailable. Check request status before retrying.');
   return result.data;
  };
  if(c.action==='apply'){
   const value=await call(token,'get_expedition_migration_result',{p_site:c.site,p_request:c.requestKey});
   if(value!==null){
    const receipt=receiptSchema.safeParse(value);if(!receipt.success||receipt.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    if(receipt.data.sourceDigest!==plan.sourceDigest||receipt.data.reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'This request key belongs to a different migration review.');
    const result=await apply();if(sourceDigest(result)!==sourceDigest(receipt.data.result))throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    return Response.json({result,replayed:true},{headers:privateHeaders});
   }
  }
  const collectAssets=(value:unknown,ids=new Set<string>()):Set<string>=>{
   if(Array.isArray(value))for(const item of value)collectAssets(item,ids);
   else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if(key==='assetId'&&typeof item==='string')ids.add(item);else collectAssets(item,ids);}
   return ids;
  };
  // Include original-gallery mappings even when reviewed display excludes an image.
  const assets=[...collectAssets(plan.candidates.map(item=>item.mapping))];
  const refs=new Map<string,{recordId:string;type:'specialist'|'form'}>();
  for(const item of plan.candidates){
   for(const ref of item.mapping?.specialists??[])refs.set(`specialist:${ref.recordId}`,{recordId:ref.recordId,type:'specialist'});
   const form=item.mapping?.display.enquiry.form;if(form)refs.set(`form:${form.recordId}`,{recordId:form.recordId,type:'form'});
  }
  const references=[...refs.values()];if(assets.length>500||references.length>500)throw new CmsGatewayError(422,'Review a smaller batch of expeditions.');
  const checked=evidenceSchema.safeParse(await call(token,'review_expedition_migration_links',{p_site:c.site,p_assets:assets,p_references:references}));
  if(!checked.success)throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  const evidence=checked.data;
  if(evidence.assets.length!==assets.length||evidence.references.length!==references.length||evidence.assets.some((item,index)=>item.assetId!==assets[index])||evidence.references.some((item,index)=>item.recordId!==references[index].recordId||item.type!==references[index].type))throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  for(const candidate of plan.candidates){
   const fail=(field:string,message:string)=>{candidate.canSaveDraft=false;candidate.issues.push({field,severity:'error',message});};
   for(const assetId of collectAssets(candidate.mapping))if(!evidence.assets.find(item=>item.assetId===assetId)?.available)fail('images',`Mapped asset ${assetId} is unavailable or lacks approved processed-image rights for this website.`);
   const mapping=candidate.mapping;if(!mapping)continue;
   const check=(recordId:string,type:'specialist'|'form',field:string)=>{const item=evidence.references.find(item=>item.recordId===recordId&&item.type===type);if(!item?.available||item.locale!==c.locale)fail(field,'Mapped content is unavailable, has the wrong type or belongs to another language.');};
   mapping.specialists.forEach((item,index)=>check(item.recordId,'specialist',`specialists.${index}`));
   check(mapping.display.enquiry.form.recordId,'form','enquiry.form');
  }
  plan.readyDrafts=plan.candidates.filter(item=>item.canSaveDraft).length;
  const reviewDigest=sourceDigest({version:'expedition-migration-review-1',site:c.site,locale:c.locale,plan,evidence});
  const applyAvailable=plan.readyDrafts===plan.count&&plan.unusedMappings.length===0;
  if(c.action==='review')return Response.json({plan,reviewDigest,applyAvailable,verification:{media:true,references:true,publication:false},message:'Reference checks establish draft access, not public delivery readiness.'},{headers:privateHeaders});
  if(c.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'Review the current source, mappings and availability before importing.');
  if(!applyAvailable)throw new CmsGatewayError(422,'Resolve all migration errors and unused mappings before importing.');
  return Response.json({result:await apply(),replayed:false},{headers:privateHeaders});
 }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Check the expedition migration source and mappings.'},{status:422,headers:privateHeaders});return cmsErrorResponse(error);}
}
