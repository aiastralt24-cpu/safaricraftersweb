import {z} from 'zod';
import {createHash} from 'node:crypto';
import {fileBytes} from './import-api.ts';
import {parseJournalDocx,parseJournalXlsx,ImportFileError} from './import-file.ts';
import {planJournalImport,type ExistingJournalImport} from './journal-import-plan.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {journalImportLinks,verifyJournalImportEvidence} from './journal-import-evidence.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import type {EditorRpc} from './editor-api.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const command=z.object({site:z.string().uuid(),format:z.enum(['xlsx','docx']).nullable(),action:z.enum(['review','apply','status']),requestKey:z.string().uuid().nullable(),reviewDigest:digest.nullable()}).refine(c=>c.action==='status'?Boolean(c.requestKey):Boolean(c.format)&&(c.action!=='apply'||Boolean(c.requestKey&&c.reviewDigest)));
const resultsSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^journal_import_[a-f0-9]{64}$/)}).strict()).min(1).max(25).refine(rows=>new Set(rows.map(r=>r.recordId)).size===rows.length&&new Set(rows.map(r=>r.sourceKey)).size===rows.length);
const receiptSchema=z.object({requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,result:resultsSchema}).strict();
function checkedReceipt(raw:unknown,key:string){
 const parsed=receiptSchema.safeParse(raw);
 if(!parsed.success||parsed.data.requestKey!==key)throw new CmsGatewayError(503,'Import recovery could not be verified. Keep the request ID and check again.');
 return parsed.data;
}
const recordSchema=z.object({id:z.string().uuid(),type:z.literal('journalArticle'),currentRevision:z.string().uuid(),path:z.string(),locale:z.string(),payload:z.record(z.string(),z.unknown())});
/** Rebuild reviewed drafts from original bytes; never accept a client manifest. */
export async function handleJournalImportUpload(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse({site:request.headers.get('x-cms-site'),format:request.headers.get('x-cms-format'),action:request.headers.get('x-cms-action'),requestKey:request.headers.get('idempotency-key'),reviewDigest:request.headers.get('x-cms-review')});
  if(!parsed.success)throw new CmsGatewayError(400,'Review the journal file and supply its review digest and request ID before saving.');
  const h=parsed.data,sites=await call(token,'list_editor_sites',{});
  if(!Array.isArray(sites)||!sites.some(site=>site&&site.id===h.site))throw new CmsGatewayError(403,'You do not have access to this website.');
  if(h.action==='status'){
   const raw=await call(token,'get_journal_import_receipt',{p_site:h.site,p_request:h.requestKey});
   if(raw===null)return Response.json({status:'unconfirmed',message:'No completed receipt is visible. This does not prove that a pending request failed.'},{headers:privateHeaders});
   return Response.json({status:'complete',...checkedReceipt(raw,h.requestKey!)},{headers:privateHeaders});
  }
  const bytes=await fileBytes(request),sourceHash=createHash('sha256').update(bytes).digest('hex');
  if(h.action==='apply'){
   const raw=await call(token,'get_journal_import_receipt',{p_site:h.site,p_request:h.requestKey});
   if(raw!==null){const receipt=checkedReceipt(raw,h.requestKey!);if(receipt.sourceDigest!==sourceHash||receipt.reviewDigest!==h.reviewDigest)throw new CmsGatewayError(409,'This request ID already belongs to a different reviewed import.');return Response.json({applied:true,replayed:true,...receipt},{headers:privateHeaders});}
  }
  const file=await(h.format==='xlsx'?parseJournalXlsx:parseJournalDocx)(bytes);
  if((file.input.sheets.Pages??[]).filter(row=>Object.values(row).some(v=>v.trim())).length>25)throw new CmsGatewayError(413,'Import at most 25 journal articles per batch.');
  // Resolve only requested update UUIDs, using the user's token. Never trust IDs,
  // revisions or existing payloads supplied outside the uploaded template.
  const ids=[...new Set((file.input.sheets.Pages??[]).filter(row=>row.operation==='update'&&z.string().uuid().safeParse(row.recordId).success).map(row=>row.recordId))];
  const existing:ExistingJournalImport[]=[];let totalBytes=0;
  for(let offset=0;offset<ids.length;offset+=10){
   const batch=ids.slice(offset,offset+10);
   const records=await Promise.all(batch.map(id=>call(token,'get_editor_record',{p_site:h.site,p_record:id})));
   for(const [index,value]of records.entries()){
    if(value===null)continue;
    totalBytes+=Buffer.byteLength(JSON.stringify(value)??'');if(totalBytes>5_000_000)throw new CmsGatewayError(413,'Split this import into smaller batches.');
    const record=recordSchema.safeParse(value);
    if(!record.success||record.data.id!==batch[index])throw new CmsGatewayError(422,'An existing journal could not be verified.');
    const r=record.data;
    if(r.path!==`/journal/${r.payload.slug}`)throw new CmsGatewayError(422,'An existing journal URL needs repair before import.');
    existing.push({recordId:r.id,revision:r.currentRevision,locale:r.locale,payload:r.payload});
   }
  }
  const plan=planJournalImport(file.input,existing);
  const manifest=plan.changes.map(c=>({sourceKey:`journal_import_${sourceDigest(c.importId)}`,operation:c.operation,recordId:c.recordId,expectedRevision:c.expectedRevision,locale:c.locale,payload:c.payload}));
  // Reserve space for PostgreSQL JSONB serialization whitespace within its 1.1 MB limit.
  if(Buffer.byteLength(JSON.stringify(manifest))>1_000_000)throw new CmsGatewayError(413,'Split this import into smaller batches.');
  let evidence:unknown=null;
  if(plan.valid){
   const links=journalImportLinks(plan.changes);
   if(links.assets.length>500)throw new CmsGatewayError(413,'Split this import into smaller batches.');
   const raw=await call(token,'review_journal_import_links',{p_site:h.site,p_create:plan.changes.some(c=>c.operation==='create'),p_records:plan.changes.flatMap(c=>c.recordId?[c.recordId]:[]),p_assets:links.assets});
   const checked=verifyJournalImportEvidence(plan.changes,raw);
   if(!checked)throw new CmsGatewayError(503,'Journal import availability checks are unavailable.');
   evidence=checked.evidence;
   // Resolve findings to the original Pages row, including blank Office rows.
   for(const issue of checked.issues){const identity=issue.message.slice(0,issue.message.indexOf(':'));issue.row=(file.input.sheets.Pages??[]).findIndex(p=>p.recordId===identity)+2;}
   plan.issues.push(...checked.issues);if(checked.issues.length)plan.valid=false;
  }
  const reviewDigest=sourceDigest({version:'journal-office-review-1',site:h.site,source:file.source.sha256,plan,evidence,manifest});
  if(h.action==='review')return Response.json({source:file.source,plan,reviewDigest,applyAvailable:plan.valid,verification:{currentRecords:true,media:evidence!==null},message:'Review these changes before saving drafts. Saving does not publish pages.'},{headers:privateHeaders});
  if(h.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'The reviewed content or availability changed. Review the file again.');
  if(!plan.valid)throw new CmsGatewayError(422,'Resolve import errors before saving drafts.');
  const raw=await call(token,'apply_journal_import',{p_site:h.site,p_request:h.requestKey,p_source:sourceHash,p_review:reviewDigest,p_items:manifest});
  const result=resultsSchema.safeParse(raw);
  if(!result.success||result.data.length!==manifest.length||result.data.some(row=>!manifest.some(item=>item.sourceKey===row.sourceKey&&(item.recordId===null||item.recordId===row.recordId))))throw new CmsGatewayError(503,'The save result could not be verified. Keep the request ID and check its status before retrying.');
  return Response.json({applied:true,replayed:false,requestKey:h.requestKey,sourceDigest:sourceHash,reviewDigest,result:result.data},{headers:privateHeaders});
 }catch(error){
  if(error instanceof ImportFileError)return Response.json({error:error.message},{status:422,headers:privateHeaders});
  return cmsErrorResponse(error);
 }
}
