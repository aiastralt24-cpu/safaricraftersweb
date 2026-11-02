import {z} from 'zod';
import {planDestinationMigration} from './destination-migration.ts';
import {destinationSchema} from './destinations.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.object({action:z.enum(['review','apply']),site:z.string().uuid(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),source:z.array(z.record(z.string(),z.unknown())).min(1).max(25),mappings:z.record(z.string(),z.unknown()).default({}),requestKey:z.string().uuid().optional(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().refine(c=>c.action==='review'||Boolean(c.requestKey&&c.reviewDigest),'Apply requires the reviewed digest and a request key.');
const reference=z.object({recordId:z.string().uuid(),type:z.enum(['journey','photoExpedition','destination']),available:z.boolean(),locale:z.string().optional()}).strict();
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(reference).max(500)}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleDestinationMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const input=await readBoundedJson(request);
  if(input&&typeof input==='object'&&'action' in input&&input.action==='status'){
   const status=z.object({action:z.literal('status'),site:z.string().uuid(),requestKey:z.string().uuid()}).strict().parse(input);
   const result=await call(token,'get_destination_migration_result',{p_site:status.site,p_request:status.requestKey});
   if(result===null)return Response.json({status:'unconfirmed',message:'No completed migration is visible. This does not prove that a pending request failed.'},{headers:privateHeaders});
   const receipt=z.object({requestKey:z.string().uuid(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.string().datetime({offset:true}),result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^destination_[a-f0-9]{64}$/)}).passthrough()).min(1).max(25)}).strict().safeParse(result);
   if(!receipt.success||receipt.data.requestKey!==status.requestKey||new Set(receipt.data.result.map(item=>item.recordId)).size!==receipt.data.result.length||new Set(receipt.data.result.map(item=>item.sourceKey)).size!==receipt.data.result.length)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
   return Response.json({status:'complete',...receipt.data},{headers:privateHeaders});
  }
  const c=command.parse(input),plan=planDestinationMigration(c.source,c.mappings);
  const assets=new Set<string>(),refs=new Map<string,{recordId:string;type:'journey'|'photoExpedition'|'destination'}>();
  const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
  for(const candidate of plan.candidates){visit(candidate.payload);for(const [field,type]of [['journeys','journey'],['expeditions','photoExpedition'],['pairings','destination']] as const){const values=candidate.payload[field];if(Array.isArray(values))for(const value of values){if(value&&typeof value.recordId==='string')refs.set(`${type}:${value.recordId}`,{recordId:value.recordId,type});}}}
  const assetIds=[...assets],references=[...refs.values()];if(assetIds.length>500||references.length>500)throw new CmsGatewayError(422,'Review a smaller batch of destinations.');
  const evidence=evidenceSchema.parse(await call(token,'review_destination_migration_links',{p_site:c.site,p_assets:assetIds,p_references:references}));
  if(evidence.assets.length!==assetIds.length||evidence.references.length!==references.length||evidence.assets.some((item,i)=>item.assetId!==assetIds[i])||evidence.references.some((item,i)=>item.recordId!==references[i].recordId||item.type!==references[i].type))throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  for(const candidate of plan.candidates){
   const localAssets=new Set<string>();const collect=(value:unknown)=>{if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')localAssets.add(item);else collect(item);}};collect(candidate.payload);
   const fail=(field:string,message:string)=>{candidate.issues.push({field,severity:'error',message});candidate.canSaveDraft=false;};
   for(const assetId of localAssets)if(!evidence.assets.find(item=>item.assetId===assetId)?.available)fail('media',`Mapped image ${assetId} is unavailable or lacks current processed-image approval.`);
   for(const [field,type]of [['journeys','journey'],['expeditions','photoExpedition'],['pairings','destination']] as const){const values=candidate.payload[field];if(Array.isArray(values))values.forEach((value,i)=>{const found=evidence.references.find(item=>item.recordId===value.recordId&&item.type===type);if(!found?.available||found.locale!==c.locale)fail(`${field}.${i}`,'Mapped record is unavailable, has the wrong content type or belongs to another language.');});}
  }
  plan.readyDrafts=plan.candidates.filter(item=>item.canSaveDraft).length;
  const reviewDigest=sourceDigest({site:c.site,locale:c.locale,plan,evidence});
  if(c.action==='review')return Response.json({plan,reviewDigest,applyAvailable:plan.readyDrafts===plan.count&&!plan.unusedMappings.length},{headers:privateHeaders});
  if(c.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'Review the current source, mappings and availability before applying.');
  if(plan.readyDrafts!==plan.count||plan.unusedMappings.length)throw new CmsGatewayError(422,'Resolve all migration errors and unused mappings before applying.');
  const manifest=plan.candidates.map(item=>({sourceKey:`destination_${item.sourceDigest}`,source:item.source,payload:destinationSchema.parse(item.payload),locale:c.locale}));
  const result=await call(token,'apply_destination_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:reviewDigest,p_items:manifest});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Check the migration source and mappings.'},{status:422,headers:privateHeaders});return cmsErrorResponse(error);}
}
