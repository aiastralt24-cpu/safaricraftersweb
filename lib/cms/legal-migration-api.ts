import {z} from 'zod';
import inventory from '../../docs/cms/legal-migration-inventory.json' with {type:'json'};
import {planLegalMigration} from './legal-migration.ts';
import {legalPathSchema} from './legal-page.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
const target=z.object({path:legalPathSchema,recordId:uuid.nullable(),expectedRevision:uuid.nullable()}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision),'Updates require an expected revision.');
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),site:uuid,targets:z.array(target).min(1).max(3)}).strict(),
 z.object({action:z.literal('apply'),site:uuid,targets:z.array(target).min(1).max(3),requestKey:uuid,reviewDigest:digest}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]);
const results=z.array(z.object({recordId:uuid,revisionId:uuid,path:legalPathSchema,sourceSha256:digest}).strict()).min(1).max(3).refine(items=>new Set(items.map(item=>item.path)).size===items.length&&new Set(items.map(item=>item.recordId)).size===items.length);
const receiptSchema=z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string(),result:results}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
const version='legal-migration-1';
export async function handleLegalMigration(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the legal migration selection and review identity.');
  const c=parsed.data;
  const receipt=async()=>{const value=await call(token,'get_legal_migration_result',{p_site:c.site,p_request:'requestKey' in c?c.requestKey:null});if(value===null)return null;const parsed=receiptSchema.safeParse(value);if(!parsed.success||parsed.data.requestKey!==('requestKey' in c?c.requestKey:null))throw new CmsGatewayError(503,'Migration recovery is unavailable.');return parsed.data;};
  if(c.action==='status'){const saved=await receipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  if(new Set(c.targets.map(item=>item.path)).size!==c.targets.length)throw new CmsGatewayError(422,'Select each legal page only once.');
  const plans=c.targets.toSorted((a,b)=>a.path.localeCompare(b.path)).map(item=>{
   const source=inventory.pages.find(page=>page.path===item.path);if(!source)throw new CmsGatewayError(503,'The bundled legal migration source is unavailable.');
   // The capture is deployment-owned. Build tests verify its source-file freshness.
   const plan=planLegalMigration(source,source.sourceSha256);if(!plan.candidate)throw new CmsGatewayError(422,'This legal source has unresolved migration findings.');
   return {...item,sourceSha256:source.sourceSha256,payload:plan.candidate};
  });
  const source=sourceDigest(plans.map(item=>({path:item.path,sourceSha256:item.sourceSha256,payload:item.payload}))),review=sourceDigest({version,site:c.site,source,items:plans});
  if(c.action==='apply'&&c.reviewDigest!==review)throw new CmsGatewayError(409,'The migration selection or source changed. Review it again.');
  const apply=async()=>{
   if(c.action!=='apply')throw new Error('Invalid apply state');
   const raw=await call(token,'apply_legal_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:review,p_items:plans});
   const result=results.safeParse(raw);if(!result.success||result.data.length!==plans.length||result.data.some(item=>!plans.some(plan=>plan.path===item.path&&plan.sourceSha256===item.sourceSha256&&(!plan.recordId||plan.recordId===item.recordId))))throw new CmsGatewayError(503,'Migration receipt is unavailable. Check request status before retrying.');
   return result.data;
  };
  if(c.action==='apply'){
   const saved=await receipt();if(saved){if(saved.sourceDigest!==source||saved.reviewDigest!==review)throw new CmsGatewayError(409,'This request key belongs to a different migration review.');const result=await apply();if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Migration recovery is unavailable.');return Response.json({result,replayed:true},{headers:privateHeaders});}
  }
  const reviewed=await Promise.all(plans.map(async item=>{
   if(!item.recordId){if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'page',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create legal pages for this website.');return {...item,before:null};}
   const raw=await call(token,'get_editor_record',{p_site:c.site,p_record:item.recordId});
   const record=z.object({id:uuid,type:z.literal('page'),path:legalPathSchema,locale:z.literal('en'),currentRevision:uuid,payload:z.record(z.string(),z.unknown()),permissions:z.object({edit:z.boolean()})}).safeParse(raw);
   if(!record.success||record.data.id!==item.recordId||record.data.path!==item.path||!record.data.permissions.edit)throw new CmsGatewayError(403,'The selected legal page is unavailable or cannot be edited.');
   if(record.data.currentRevision!==item.expectedRevision)throw new CmsGatewayError(409,'This page changed. Reload it before reviewing the migration.');
   return {...item,before:record.data.payload};
  }));
  if(c.action==='review')return Response.json({version,sourceDigest:source,reviewDigest:review,items:reviewed,applyAvailable:true,notice:'Apply creates drafts only. Existing page content will be replaced in the draft; review the before and after content.'},{headers:privateHeaders});
  return Response.json({result:await apply(),replayed:false},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
