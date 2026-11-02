import {z} from 'zod';
import {createHash} from 'node:crypto';
import {fileBytes} from './import-api.ts';
import {parseProjectDocx,parseProjectXlsx,ImportFileError} from './import-file.ts';
import {planProjectImport,type ExistingProjectImport} from './project-import-plan.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {projectImportLinks,verifyProjectImportEvidence} from './project-import-evidence.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import type {EditorRpc} from './editor-api.ts';
import {projectSchema} from './projects.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const command=z.object({site:z.string().uuid(),format:z.enum(['xlsx','docx']).nullable(),action:z.enum(['review','apply','status','cancel']),requestKey:z.string().uuid().nullable(),sourceDigest:digest.nullable(),reviewDigest:digest.nullable()}).refine(c=>c.action==='cancel'?Boolean(c.requestKey&&c.sourceDigest&&c.reviewDigest):c.action==='status'?Boolean(c.requestKey):Boolean(c.format)&&(c.action!=='apply'||Boolean(c.requestKey&&c.reviewDigest)));
const resultsSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^project_import_[a-f0-9]{64}$/)}).strict()).min(1).max(25).refine(rows=>new Set(rows.map(r=>r.recordId)).size===rows.length&&new Set(rows.map(r=>r.sourceKey)).size===rows.length);
const receiptSchema=z.object({requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,result:resultsSchema}).strict();
function checkedReceipt(raw:unknown,key:string){
 const parsed=receiptSchema.safeParse(raw);
 if(!parsed.success||parsed.data.requestKey!==key)throw new CmsGatewayError(503,'Import recovery could not be verified. Keep the request ID and check again.');
 return parsed.data;
}
const cancellationSchema=z.object({status:z.literal('cancelled'),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest}).strict();
function cancelledReceipt(raw:unknown,key:string){
 const parsed=cancellationSchema.safeParse(raw);
 if(!parsed.success||parsed.data.requestKey!==key)throw new CmsGatewayError(503,'Cancellation could not be verified. Keep the request ID and check again.');
 return parsed.data;
}
function isCancelled(raw:unknown){return Boolean(raw&&typeof raw==='object'&&'status' in raw&&raw.status==='cancelled');}
const recordSchema=z.object({id:z.string().uuid(),type:z.literal('project'),currentRevision:z.string().uuid(),path:z.string(),locale:z.string(),payload:z.record(z.string(),z.unknown())});
/** Rebuild reviewed drafts from original bytes; never accept a client manifest. */
export async function handleProjectImportUpload(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse({site:request.headers.get('x-cms-site'),format:request.headers.get('x-cms-format'),action:request.headers.get('x-cms-action'),requestKey:request.headers.get('idempotency-key'),sourceDigest:request.headers.get('x-cms-source'),reviewDigest:request.headers.get('x-cms-review')});
  if(!parsed.success)throw new CmsGatewayError(400,'Review the project file and supply its review digest and request ID before saving.');
  const h=parsed.data,sites=await call(token,'list_editor_sites',{});
  if(!Array.isArray(sites)||!sites.some(site=>site&&site.id===h.site))throw new CmsGatewayError(403,'You do not have access to this website.');
  if(h.action==='cancel'){
   const raw=await call(token,'cancel_project_import',{p_site:h.site,p_request:h.requestKey,p_source:h.sourceDigest,p_review:h.reviewDigest});
   const result=isCancelled(raw)?cancelledReceipt(raw,h.requestKey!):checkedReceipt(raw,h.requestKey!);
   if(result.sourceDigest!==h.sourceDigest||result.reviewDigest!==h.reviewDigest)throw new CmsGatewayError(503,'Cancellation identity could not be verified. Keep the request ID.');
   return Response.json(isCancelled(raw)?result:{status:'complete',...result},{headers:privateHeaders});
  }
  if(h.action==='status'){
   const raw=await call(token,'get_project_import_receipt',{p_site:h.site,p_request:h.requestKey});
   if(raw===null)return Response.json({status:'unconfirmed',message:'No completed receipt is visible. This does not prove that a pending request failed.'},{headers:privateHeaders});
   if(isCancelled(raw))return Response.json(cancelledReceipt(raw,h.requestKey!),{headers:privateHeaders});
   return Response.json({status:'complete',...checkedReceipt(raw,h.requestKey!)},{headers:privateHeaders});
  }
  const bytes=await fileBytes(request),sourceHash=createHash('sha256').update(bytes).digest('hex');
  if(h.action==='apply'){
   const raw=await call(token,'get_project_import_receipt',{p_site:h.site,p_request:h.requestKey});
   if(isCancelled(raw)){cancelledReceipt(raw,h.requestKey!);throw new CmsGatewayError(409,'This import was cancelled. Start a new review.');}
   if(raw!==null){const receipt=checkedReceipt(raw,h.requestKey!);if(receipt.sourceDigest!==sourceHash||receipt.reviewDigest!==h.reviewDigest)throw new CmsGatewayError(409,'This request ID already belongs to a different reviewed import.');return Response.json({applied:true,replayed:true,...receipt},{headers:privateHeaders});}
  }
  const file=await(h.format==='xlsx'?parseProjectXlsx:parseProjectDocx)(bytes);
  if((file.input.sheets.Pages??[]).filter(row=>Object.values(row).some(v=>v.trim())).length>25)throw new CmsGatewayError(413,'Import at most 25 projects per batch.');
  // Resolve only requested update UUIDs, using the user's token. Never trust IDs,
  // revisions or existing payloads supplied outside the uploaded template.
  const ids=[...new Set((file.input.sheets.Pages??[]).filter(row=>row.operation==='update'&&z.string().uuid().safeParse(row.recordId).success).map(row=>row.recordId))];
  const existing:ExistingProjectImport[]=[];let totalBytes=0;
  for(let offset=0;offset<ids.length;offset+=10){
   const batch=ids.slice(offset,offset+10);
   const records=await Promise.all(batch.map(id=>call(token,'get_editor_record',{p_site:h.site,p_record:id})));
   for(const [index,value]of records.entries()){
    if(value===null)continue;
    totalBytes+=Buffer.byteLength(JSON.stringify(value)??'');if(totalBytes>5_000_000)throw new CmsGatewayError(413,'Split this import into smaller batches.');
    const record=recordSchema.safeParse(value);
    if(!record.success||record.data.id!==batch[index])throw new CmsGatewayError(422,'An existing project could not be verified.');
    const r=record.data;
    if(r.path!==`/projects/${r.payload.slug}`)throw new CmsGatewayError(422,'An existing project URL needs repair before import.');
    existing.push({recordId:r.id,revision:r.currentRevision,locale:r.locale,payload:r.payload});
   }
  }
  const plan=planProjectImport(file.input,existing);
  const manifest=plan.changes.map(c=>({sourceKey:`project_import_${sourceDigest(c.importId)}`,operation:c.operation,recordId:c.recordId,expectedRevision:c.expectedRevision,locale:c.locale,payload:c.payload}));
  // Reserve space for PostgreSQL JSONB serialization whitespace within its 1.1 MB limit.
  if(Buffer.byteLength(JSON.stringify(manifest))>1_000_000)throw new CmsGatewayError(413,'Split this import into smaller batches.');
  let evidence:unknown=null;
  if(plan.valid){
   const links=projectImportLinks(plan.changes);
   if(links.assets.length>500||links.references.length>500)throw new CmsGatewayError(413,'Split this import into smaller batches.');
   const raw=await call(token,'review_project_import_links',{p_site:h.site,p_create:plan.changes.some(c=>c.operation==='create'),p_records:plan.changes.flatMap(c=>c.recordId?[c.recordId]:[]),p_assets:links.assets,p_references:links.references});
   const checked=verifyProjectImportEvidence(plan.changes,raw);
   if(!checked)throw new CmsGatewayError(503,'Project import availability checks are unavailable.');
   evidence=checked.evidence;
   // Resolve findings to the original Pages row, including blank Office rows.
   for(const issue of checked.issues){const identity=issue.message.slice(0,issue.message.indexOf(':'));issue.row=(file.input.sheets.Pages??[]).findIndex(p=>p.recordId===identity)+2;}
   plan.issues.push(...checked.issues);if(checked.issues.length)plan.valid=false;
  }
  const comparisons=plan.changes.map(change=>({importId:change.importId,revision:change.expectedRevision,before:change.operation==='create'?null:projectSchema.parse(existing.find(record=>record.recordId===change.recordId)?.payload)}));
  const reviewDigest=sourceDigest({version:'project-office-review-2',site:h.site,source:file.source.sha256,plan,evidence,manifest,comparisons});
  if(h.action==='review')return Response.json({source:file.source,plan,comparisons,reviewDigest,applyAvailable:plan.valid,verification:{currentRecords:true,media:evidence!==null,references:evidence!==null},message:'Review these changes before saving drafts. Saving does not publish pages.'},{headers:privateHeaders});
  if(h.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'The reviewed content or availability changed. Review the file again.');
  if(!plan.valid)throw new CmsGatewayError(422,'Resolve import errors before saving drafts.');
  const raw=await call(token,'apply_project_import',{p_site:h.site,p_request:h.requestKey,p_source:sourceHash,p_review:reviewDigest,p_items:manifest,p_evidence:evidence});
  const result=resultsSchema.safeParse(raw);
  if(!result.success||result.data.length!==manifest.length||result.data.some(row=>!manifest.some(item=>item.sourceKey===row.sourceKey&&(item.recordId===null||item.recordId===row.recordId))))throw new CmsGatewayError(503,'The save result could not be verified. Keep the request ID and check its status before retrying.');
  return Response.json({applied:true,replayed:false,requestKey:h.requestKey,sourceDigest:sourceHash,reviewDigest,result:result.data},{headers:privateHeaders});
 }catch(error){
  if(error instanceof ImportFileError)return Response.json({error:error.message},{status:422,headers:privateHeaders});
  return cmsErrorResponse(error);
 }
}
