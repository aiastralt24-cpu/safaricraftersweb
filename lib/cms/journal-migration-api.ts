import {z} from 'zod';
import {journalArticleSchema} from './journal.ts';
import {planJournalMigration} from './journal-migration.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.object({action:z.enum(['review','apply']),site:z.string().uuid(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),source:z.array(z.record(z.string(),z.unknown())).min(1).max(25),mappings:z.record(z.string(),z.unknown()).default({}),requestKey:z.string().uuid().optional(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().refine(c=>c.action==='review'||Boolean(c.requestKey&&c.reviewDigest),'Apply requires a review digest and request key.');
const evidenceSchema=z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500);
const resultsSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^journal_[a-f0-9]{64}$/)}).passthrough()).min(1).max(25).refine(items=>new Set(items.map(i=>i.recordId)).size===items.length&&new Set(items.map(i=>i.sourceKey)).size===items.length);
const receiptSchema=z.object({requestKey:z.string().uuid(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.string().datetime({offset:true}),result:resultsSchema}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
function assetIds(value:unknown):string[]{const ids=new Set<string>();function visit(v:unknown){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')for(const [key,item] of Object.entries(v)){if(key==='assetId'&&typeof item==='string')ids.add(item);else visit(item);}}visit(value);return [...ids];}
export async function handleJournalMigrationReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const input=await readBoundedJson(request);
  if(input&&typeof input==='object'&&'action' in input&&input.action==='status'){
   const status=z.object({action:z.literal('status'),site:z.string().uuid(),requestKey:z.string().uuid()}).strict().parse(input);
   const value=await call(token,'get_journal_migration_result',{p_site:status.site,p_request:status.requestKey});
   if(value===null)return Response.json({status:'unconfirmed',message:'No completed migration is visible. This does not prove that a pending request failed.'},{headers:privateHeaders});
   const receipt=receiptSchema.safeParse(value);
   if(!receipt.success||receipt.data.requestKey!==status.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
   return Response.json({status:'complete',...receipt.data},{headers:privateHeaders});
  }
  const c=command.parse(input),plan=planJournalMigration(c.source,c.mappings);
  // Resolve a completed request before rechecking rights: later rights changes
  // must not turn a committed import into an apparently failed one.
  if(c.action==='apply'){
   const value=await call(token,'get_journal_migration_result',{p_site:c.site,p_request:c.requestKey});
   if(value!==null){
    const receipt=receiptSchema.safeParse(value);
    if(!receipt.success||receipt.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    if(receipt.data.sourceDigest!==plan.sourceDigest||receipt.data.reviewDigest!==c.reviewDigest)throw new CmsGatewayError(409,'This request key belongs to a different migration review.');
    // The SQL RPC compares the complete manifest too; never replay solely by digest.
    const manifest=plan.candidates.map(item=>({sourceKey:`journal_${item.sourceDigest}`,source:item.source,mappings:item.mappings,payload:journalArticleSchema.parse(item.payload),locale:c.locale}));
    const result=await call(token,'apply_journal_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:c.reviewDigest,p_items:manifest});
    const parsed=resultsSchema.safeParse(result);
    if(!parsed.success||JSON.stringify(parsed.data)!==JSON.stringify(receipt.data.result))throw new CmsGatewayError(503,'Migration recovery is unavailable.');
    return Response.json({result:parsed.data,replayed:true},{headers:privateHeaders});
   }
  }
  // Include retained hidden-image mappings: reviewing the migration must not
  // misrepresent their current availability simply because they are not visible.
  const ids=assetIds(plan.candidates.map(candidate=>({payload:candidate.payload,mappings:candidate.mappings})));
  if(ids.length>500)throw new CmsGatewayError(422,'Review a smaller batch of articles.');
  const evidence=evidenceSchema.safeParse(await call(token,'review_journal_migration_media',{p_site:c.site,p_assets:ids}));
  if(!evidence.success||evidence.data.length!==ids.length||evidence.data.some((item,i)=>item.assetId!==ids[i]))throw new CmsGatewayError(503,'Migration evidence is unavailable.');
  for(const candidate of plan.candidates){
   for(const assetId of assetIds({payload:candidate.payload,mappings:candidate.mappings}))if(!evidence.data.find(item=>item.assetId===assetId)?.available){candidate.canSaveDraft=false;candidate.issues.push({field:'media',severity:'error',message:`Mapped image ${assetId} is unavailable or lacks current processed-image approval.`});}
  }
  plan.readyDrafts=plan.candidates.filter(candidate=>candidate.canSaveDraft).length;
  const reviewDigest=sourceDigest({version:'journal-migration-review-1',site:c.site,locale:c.locale,plan,evidence:evidence.data});
  if(c.action==='review')return Response.json({plan,reviewDigest,applyAvailable:plan.readyDrafts===plan.count&&!plan.unusedMappings.length,verification:{media:true}},{headers:privateHeaders});
  if(c.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'Review the current source, mappings and availability before applying.');
  if(plan.readyDrafts!==plan.count||plan.unusedMappings.length)throw new CmsGatewayError(422,'Resolve all migration errors and unused mappings before applying.');
  const manifest=plan.candidates.map(item=>({sourceKey:`journal_${item.sourceDigest}`,source:item.source,mappings:item.mappings,payload:journalArticleSchema.parse(item.payload),locale:c.locale}));
  const result=resultsSchema.safeParse(await call(token,'apply_journal_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:reviewDigest,p_items:manifest}));
  if(!result.success||result.data.length!==manifest.length||result.data.some(item=>!manifest.some(expected=>expected.sourceKey===item.sourceKey)))throw new CmsGatewayError(503,'Migration receipt is unavailable. Check the request status before retrying.');
  return Response.json({result:result.data},{headers:privateHeaders});
 }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Check the migration source and mappings.'},{status:422,headers:privateHeaders});return cmsErrorResponse(error);}
}
