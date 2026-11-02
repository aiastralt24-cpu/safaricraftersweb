'use client';
import {useEffect,useRef,useState} from 'react';
import {importSha256,readPendingPageImport,verifyPageImportReview,verifyPageImportReceipt,type PendingPageImport} from '../../lib/cms/page-import-client';
import {PageImportChanges} from './page-import-changes';
import {PagePreviewPanel} from './page-preview-panel';
import type {LoadMediaPreview} from './media-image';
type Review=ReturnType<typeof verifyPageImportReview>;
type Props={loadPreview:LoadMediaPreview;site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean;onPending:(value:boolean)=>void;onApplied:()=>Promise<void>};
export function PageImportPanel({site,actorId,api,loadPreview,disabled,onPending,onApplied}:Props){
 const [file,setFile]=useState<File|null>(null),[review,setReview]=useState<Review|null>(null),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState<PendingPageImport|null>(null),[storageError,setStorageError]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [initialized,setInitialized]=useState(false);
 const working=useRef(false),alive=useRef(true),input=useRef<HTMLInputElement>(null),storageKey=`cms-page-import:${site}:${actorId}`;
 useEffect(()=>{alive.current=true;try{setPending(readPendingPageImport(localStorage.getItem(storageKey),site,actorId));}catch{setStorageError(true);setError('Saved import recovery data needs attention. Do not start another import until its result is checked.');}setInitialized(true);return()=>{alive.current=false;};},[site,actorId,storageKey]);
 useEffect(()=>onPending(Boolean(file||pending||storageError||busy||!initialized)),[file,pending,storageError,busy,initialized,onPending]);
 async function complete(response:unknown,tracker:PendingPageImport){
  const rows=verifyPageImportReceipt(response,tracker);localStorage.removeItem(storageKey);setPending(null);setFile(null);setReview(null);setAck(false);if(input.current)input.current.value='';setMessage(`${rows.length} page ${rows.length===1?'draft saved':'drafts saved'}. Nothing was published.`);try{await onApplied();}catch{if(alive.current)setMessage('Drafts saved. Refresh the page list to view them.');}
 }
 async function run(action:'review'|'apply'|'status'){
  if(working.current||disabled||!initialized||storageError||action==='review'&&Boolean(pending)||action!=='status'&&!file||action==='apply'&&(!review?.applyAvailable||!ack)||action==='status'&&!pending)return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   let tracker=pending;
   const format=file?.name.toLowerCase().endsWith('.xlsx')?'xlsx':'docx';
   if(action==='apply'&&!tracker){
    const targets=await Promise.all(review!.plan.changes.map(async c=>({sourceKey:`page_import_${await importSha256(new TextEncoder().encode(JSON.stringify(c.importId)))}`,recordId:c.recordId})));
    tracker={version:1,actorId,site,requestKey:crypto.randomUUID(),sourceDigest:review!.source.sha256,reviewDigest:review!.reviewDigest,targets};
    localStorage.setItem(storageKey,JSON.stringify(tracker));setPending(tracker);
   }
   const response=await api('/api/cms/import/pages',{method:'POST',headers:{'X-CMS-Site':site,'X-CMS-Action':action,...(action!=='status'?{'X-CMS-Format':format}:{}),...(tracker?{'Idempotency-Key':tracker.requestKey,'X-CMS-Review':tracker.reviewDigest}:{})},...(action!=='status'?{body:file!}:{})});
   if(!alive.current)return;
   if(action==='review'){
    const hash=await importSha256(await file!.arrayBuffer());if(!alive.current)return;setReview(verifyPageImportReview(response,{hash,size:file!.size,format}));setAck(false);
   }else if(action==='status'&&response.status==='unconfirmed')setMessage('No completed receipt is visible yet. Keep this request ID and check again before starting another import.');
   else {if(action==='status'&&response.status!=='complete')throw Error('Import status could not be verified.');await complete(response,tracker!);}
  }catch(e){if(alive.current)setError((action==='apply'?'Save could not be confirmed. Check its saved result before starting another import. ':'')+(e instanceof Error?e.message:'Import request failed.'));}
  finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <details className='cms-destination-migration'><summary>Import Word or Excel content</summary><p>Prepare up to 25 English custom pages using a structured template. Review the full proposed drafts before saving. Imports never publish automatically.</p><p>Use the structured page template with stable section IDs and existing CMS image/document IDs. <a href='/cms/templates/page-v1.xlsx' download>Download Excel template</a> · <a href='/cms/templates/page-v1.docx' download>Download Word template</a>.</p><fieldset disabled={disabled||busy||!initialized||Boolean(pending)||storageError}><label>Page content file<input ref={input} type='file' accept='.xlsx,.docx' onChange={e=>{setReview(null);setAck(false);setError('');setMessage('');const selected=e.target.files?.[0];if(selected&&(!/\.(xlsx|docx)$/i.test(selected.name)||selected.size>5_000_000||!selected.size)){setFile(null);setError('Choose a nonempty Word or Excel template under 5 MB.');return;}setFile(selected??null);}}/></label><button type='button' disabled={!file} onClick={()=>void run('review')}>Review file</button>{file&&<button type='button' onClick={()=>{setFile(null);setReview(null);setAck(false);if(input.current)input.current.value='';}}>Discard review</button>}</fieldset>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&<><p>{review.plan.changes.length} proposed page {review.plan.changes.length===1?'draft':'drafts'}. {review.applyAvailable?'Ready for your review.':'Resolve the findings before saving.'}</p><ul>{review.plan.issues.map((issue,i)=><li key={i}>{issue.severity==='error'?'Fix':'Review'}: {issue.sheet}, row {issue.row}, {issue.field}: {issue.message}</li>)}</ul>{review.plan.changes.map(change=><details key={change.importId}><summary>{change.operation==='create'?'Create':'Update'} {change.title}</summary><p>{change.path} · {change.locale}</p><p>{change.operation==='create'?'Create a new page. No menu entry is added.':change.replaceSections?'Replace the entire section list. Review removals carefully.':'Retain existing sections; update page details and supplied SEO fields.'}</p><PageImportChanges value={change.comparison}/><p>{change.payload.seo.description}</p><PagePreviewPanel websiteId={site} value={change.payload.composition} locale={change.locale} loadPreview={loadPreview}/><details><summary>All proposed content</summary><pre>{JSON.stringify(change.payload,null,2)}</pre></details></details>)}<label><input type='checkbox' checked={ack} disabled={disabled||busy||!initialized||Boolean(pending)||!review.applyAvailable} onChange={e=>setAck(e.target.checked)}/>I reviewed the proposed content, replacements and warnings.</label><button type='button' disabled={disabled||busy||!initialized||Boolean(pending)||!ack||!review.applyAvailable} onClick={()=>void run('apply')}>Save reviewed drafts</button></>}{pending&&<aside><p>Pending request: <code>{pending.requestKey}</code>. Recovery identifiers are stored in this browser; the uploaded file is not.</p><button type='button' disabled={disabled||busy||!initialized} onClick={()=>void run('status')}>Check saved import result</button>{file&&review&&<button type='button' disabled={disabled||busy||!initialized} onClick={()=>void run('apply')}>Retry same reviewed file</button>}</aside>}{busy&&<p role='status'>Working…</p>}</details>;
}
