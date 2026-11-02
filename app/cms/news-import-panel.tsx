'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyNewsImportCancellation,importSha256,readPendingNewsImport,verifyNewsImportReview,verifyNewsImportReceipt,type PendingNewsImport} from '../../lib/cms/news-import-client';
import {NewsImportComparison} from './news-import-comparison';
import {NewsPreview} from './news-preview';
import type {LoadMediaPreview} from './media-image';
type Review=ReturnType<typeof verifyNewsImportReview>;
type Props={loadPreview:LoadMediaPreview;site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean;onPending:(value:boolean)=>void;onApplied:()=>Promise<void>};
export function NewsImportPanel({site,actorId,api,loadPreview,disabled,onPending,onApplied}:Props){
 const [file,setFile]=useState<File|null>(null),[review,setReview]=useState<Review|null>(null),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState<PendingNewsImport|null>(null),[storageError,setStorageError]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [initialized,setInitialized]=useState(false);
 const [previewId,setPreviewId]=useState<string|null>(null);
 const working=useRef(false),alive=useRef(true),input=useRef<HTMLInputElement>(null),storageKey=`cms-news-import:${site}:${actorId}`;
 useEffect(()=>{alive.current=true;try{setPending(readPendingNewsImport(localStorage.getItem(storageKey),site,actorId));}catch{setStorageError(true);setError('Saved import recovery data needs attention. Do not start another import until its result is checked.');}setInitialized(true);return()=>{alive.current=false;};},[site,actorId,storageKey]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key!==storageKey&&event.key!==null)return;setReview(null);setAck(false);try{setPending(readPendingNewsImport(localStorage.getItem(storageKey),site,actorId));}catch{setStorageError(true);setError('Saved recovery data could not be verified. Reload and resolve it before another import.');}};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[storageKey,site,actorId]);
 useEffect(()=>onPending(Boolean(file||pending||storageError||busy||!initialized)),[file,pending,storageError,busy,initialized,onPending]);
 async function complete(response:unknown,tracker:PendingNewsImport){
  const rows=verifyNewsImportReceipt(response,tracker);
  // Keep the receipt tracker until the affected editor and list refresh successfully.
  await onApplied();if(!alive.current)return;
  if(readPendingNewsImport(localStorage.getItem(storageKey),site,actorId)?.requestKey!==tracker.requestKey)throw Error('Recovery identity changed. Reload the workspace.');
  localStorage.removeItem(storageKey);setPending(null);setFile(null);setReview(null);setPreviewId(null);setAck(false);if(input.current)input.current.value='';setMessage(`${rows.length} news ${rows.length===1?'draft saved':'drafts saved'}. Nothing was published.`);

 }
 async function execute(action:'review'|'apply'|'status'|'cancel'){
  if(working.current||disabled||!initialized||storageError||action==='review'&&Boolean(pending)||(action==='review'||action==='apply')&&!file||action==='apply'&&(!review?.applyAvailable||!ack)||(action==='status'||action==='cancel')&&!pending)return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   let tracker=readPendingNewsImport(localStorage.getItem(storageKey),site,actorId);
   if(tracker)setPending(tracker);
   if(action==='review'&&tracker)throw Error('Recover the pending import before reviewing another file.');
   if((action==='status'||action==='cancel')&&!tracker)throw Error('This import was resolved in another tab. Reload the news workspace.');
   if(action==='apply'&&tracker&&(tracker.sourceDigest!==review!.source.sha256||tracker.reviewDigest!==review!.reviewDigest))throw Error('Another reviewed import is pending. Check its result first.');
   const format=file?.name.toLowerCase().endsWith('.xlsx')?'xlsx':'docx';
   if(action==='apply'&&!tracker){
    const targets=await Promise.all(review!.plan.changes.map(async c=>({sourceKey:`news_import_${await importSha256(new TextEncoder().encode(JSON.stringify(c.importId)))}`,recordId:c.recordId})));
    tracker={version:1,actorId,site,requestKey:crypto.randomUUID(),sourceDigest:review!.source.sha256,reviewDigest:review!.reviewDigest,targets};
    localStorage.setItem(storageKey,JSON.stringify(tracker));if(readPendingNewsImport(localStorage.getItem(storageKey),site,actorId)?.requestKey!==tracker.requestKey)throw Error('Import recovery could not be stored.');setPending(tracker);
   }
   const response=await api('/api/cms/import/news',{method:'POST',headers:{'X-CMS-Site':site,'X-CMS-Action':action,...((action==='review'||action==='apply')?{'X-CMS-Format':format}:{}),...(tracker?{'Idempotency-Key':tracker.requestKey,'X-CMS-Review':tracker.reviewDigest,'X-CMS-Source':tracker.sourceDigest}:{})},...((action==='review'||action==='apply')?{body:file!}:{})});
   if(!alive.current)return;
   if(action==='review'){
    const hash=await importSha256(await file!.arrayBuffer());if(!alive.current)return;setReview(verifyNewsImportReview(response,{hash,size:file!.size,format}));setPreviewId(null);setAck(false);
   }else if((action==='status'||action==='cancel')&&response.status==='cancelled'){
    verifyNewsImportCancellation(response,tracker!);
    if(readPendingNewsImport(localStorage.getItem(storageKey),site,actorId)?.requestKey!==tracker!.requestKey)throw Error('Recovery identity changed. Reload the workspace.');
    localStorage.removeItem(storageKey);setPending(null);setFile(null);setReview(null);setPreviewId(null);setAck(false);if(input.current)input.current.value='';setMessage('Import cancelled. No drafts were saved by this request. You can review another file.');
   }else if(action==='status'&&response.status==='unconfirmed')setMessage('No completed receipt is visible yet. Keep this request ID and check again before starting another import.');
   else {if((action==='status'||action==='cancel')&&response.status!=='complete')throw Error('Import status could not be verified.');await complete(response,tracker!);}
  }catch(e){if(alive.current)setError((action==='apply'?'Save could not be confirmed. Check its saved result before starting another import. ':'')+(e instanceof Error?e.message:'Import request failed.'));}
  finally{working.current=false;if(alive.current)setBusy(false);}
 }
 async function run(action:'review'|'apply'|'status'|'cancel'){
  if(!navigator.locks){setError('This browser needs Web Locks support for recoverable imports.');return;}
  await navigator.locks.request(storageKey,{ifAvailable:true},lock=>{if(!lock){setError("An import is already running in another tab. Check its result before continuing.");return;}if(alive.current)return execute(action);});
 }
 return <details className='cms-destination-migration'><summary>Import Word or Excel content</summary><p>Prepare up to 25 news items using a structured template. Review the full proposed drafts before saving. Imports never publish automatically.</p><p><a href='/cms/templates/news-v1.xlsx' download>Download Excel template</a> · <a href='/cms/templates/news-v1.docx' download>Download Word template</a></p><fieldset disabled={disabled||busy||!initialized||Boolean(pending)||storageError}><label>News content file<input ref={input} type='file' accept='.xlsx,.docx' onChange={e=>{setReview(null);setPreviewId(null);setAck(false);setError('');setMessage('');const selected=e.target.files?.[0];if(selected&&(!/\.(xlsx|docx)$/i.test(selected.name)||selected.size>5_000_000||!selected.size)){setFile(null);setError('Choose a nonempty Word or Excel template under 5 MB.');return;}setFile(selected??null);}}/></label><button type='button' disabled={!file} onClick={()=>void run('review')}>Review file</button>{file&&<button type='button' onClick={()=>{setFile(null);setReview(null);setPreviewId(null);setAck(false);if(input.current)input.current.value='';}}>Discard review</button>}</fieldset>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&<><p>{review.plan.changes.length} proposed news drafts. {review.applyAvailable?'Ready for your review.':'Resolve the findings before saving.'}</p><ul>{review.plan.issues.map((issue,i)=><li key={i}>{issue.severity==='error'?'Fix':'Review'}: {issue.sheet}, row {issue.row}, {issue.field}: {issue.message}</li>)}</ul>{review.plan.changes.map(change=><details key={change.importId}><summary>{change.operation==='create'?'Create':'Update'} {change.payload.title}</summary><p>{change.path} · {change.locale}</p><p>{change.replacedCollections.length?`Replace or clear: ${change.replacedCollections.join(', ')}`:'Omitted collections are preserved on updates.'}</p><NewsImportComparison before={review.comparisons.find(row=>row.importId===change.importId)!.before} after={change.payload}/><p>{change.payload.summary}</p><button type='button' aria-expanded={previewId===change.importId} onClick={()=>setPreviewId(current=>current===change.importId?null:change.importId)}>{previewId===change.importId?'Close content preview':'Preview proposed news'}</button>{previewId===change.importId&&<NewsPreview value={change.payload} loadPreview={loadPreview}/>}<details><summary>All proposed content</summary><pre>{JSON.stringify(change.payload,null,2)}</pre></details></details>)}<label><input type='checkbox' checked={ack} disabled={disabled||busy||!initialized||Boolean(pending)||!review.applyAvailable} onChange={e=>setAck(e.target.checked)}/>I reviewed the proposed content, replacements and warnings.</label><button type='button' disabled={disabled||busy||!initialized||Boolean(pending)||!ack||!review.applyAvailable} onClick={()=>void run('apply')}>Save reviewed drafts</button></>}{pending&&<aside><p>Pending request: <code>{pending.requestKey}</code>. Recovery identifiers are stored in this browser; the uploaded file is not.</p><button type='button' disabled={disabled||busy||!initialized} onClick={()=>void run('status')}>Check saved import result</button><button type='button' disabled={disabled||busy||!initialized} onClick={()=>{if(window.confirm('Cancel this unresolved import? If it already saved, its result will be recovered instead.'))void run('cancel');}}>Cancel unresolved import</button>{file&&review&&<button type='button' disabled={disabled||busy||!initialized} onClick={()=>void run('apply')}>Retry same reviewed file</button>}</aside>}{busy&&<p role='status'>Working…</p>}</details>;
}
