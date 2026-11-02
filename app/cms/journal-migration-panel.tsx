'use client';
import {useEffect,useRef,useState} from 'react';
import {parseJournalSnapshot,journalSourceDigest,verifyJournalReview,verifyJournalReceipt,readPendingJournalMigration,verifyJournalRecovery,journalRecoveryKey,journalImageMapping,type JournalMigrationReview,type PendingJournalMigration} from '../../lib/cms/journal-migration-client';
import type {SectionImage} from '../../lib/cms/composition';
import {MediaPicker} from './media-picker';
import {JournalPreview} from './journal-preview';
import type {LoadMediaPreview} from './media-image';
type Props={site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;disabled:boolean;onPending:(value:boolean)=>void;onApplied:()=>Promise<void>};
type Source={records:Record<string,unknown>[];keys:string[]};
type Mappings=Record<string,{images:Record<string,SectionImage>}>;
function images(record:Record<string,unknown>){
 const values:{path:string;value:unknown}[]=[{path:'image',value:record.image}];
 if(Array.isArray(record.gallery))record.gallery.forEach((value,i)=>values.push({path:`gallery.${i}`,value}));
 if(record.seo&&typeof record.seo==='object'&&'socialImage' in record.seo)values.push({path:'seo.socialImage',value:record.seo.socialImage});
 return values;
}
export function JournalMigrationPanel({site,actorId,api,loadPreview,disabled,onPending,onApplied}:Props){
 const [source,setSource]=useState<Source|null>(null),[mappings,setMappings]=useState<Mappings>({}),[locale,setLocale]=useState('en'),[review,setReview]=useState<JournalMigrationReview|null>(null),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[initialized,setInitialized]=useState(false),[storageError,setStorageError]=useState(false),[pending,setPending]=useState<PendingJournalMigration|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[preview,setPreview]=useState<number|null>(null);
 const file=useRef<HTMLInputElement>(null),alive=useRef(true),working=useRef(false),generation=useRef(0),sourceRef=useRef(source);sourceRef.current=source;
 const storageKey=journalRecoveryKey(site,actorId);
 useEffect(()=>{alive.current=true;try{setPending(readPendingJournalMigration(localStorage.getItem(storageKey),site,actorId));}catch{setStorageError(true);setError('Saved recovery data could not be read. Keep it intact and ask your administrator to check the pending request before another import.');}setInitialized(true);return()=>{alive.current=false;generation.current++;};},[site,actorId,storageKey]);
 useEffect(()=>onPending(!initialized||Boolean(source)||Boolean(pending)||busy||storageError),[initialized,source,pending,busy,storageError,onPending]);
 const locked=disabled||busy||!initialized||storageError||Boolean(pending);
 function invalidate(){setReview(null);setAck(false);setPreview(null);setError('');setMessage('');}
 async function choose(selected:File|undefined){
  if(locked||working.current)return;const version=++generation.current;invalidate();setSource(null);setMappings({});if(!selected)return;
  working.current=true;setBusy(true);
  try{if(!selected.size||selected.size>1_000_000)throw Error('Choose a nonempty JSON snapshot under 1 MB.');const records=parseJournalSnapshot(await selected.text()),keys=await Promise.all(records.map(async record=>`snapshot:${await journalSourceDigest(record)}`));if(alive.current&&generation.current===version)setSource({records,keys});}
  catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Unable to read the snapshot.');}
  finally{working.current=false;if(alive.current)setBusy(false);}
 }
 function mapImage(key:string,path:string,value:unknown,assetId:string){
  if(locked||!sourceRef.current?.keys.includes(key))return;
  try{const image=journalImageMapping(value,assetId);setMappings(current=>({...current,[key]:{images:{...current[key]?.images,[path]:image}}}));invalidate();}catch(reason){setError(reason instanceof Error?reason.message:'Image metadata needs review.');}
 }
 function discard(){if(locked)return;generation.current++;setSource(null);setMappings({});invalidate();if(file.current)file.current.value='';}
 async function complete(count:number){
  // Clear durable state before unlocking; failed storage cleanup keeps recovery available.
  localStorage.removeItem(storageKey);setPending(null);setSource(null);setMappings({});setReview(null);setAck(false);setPreview(null);if(file.current)file.current.value='';
  setMessage(`${count} article ${count===1?'draft saved':'drafts saved'}. Nothing was published.`);
  try{await onApplied();}catch{if(alive.current)setMessage(`${count} drafts were saved. Refresh the journal list to see them.`);}
 }
 async function run(action:'review'|'apply'|'status'){
  if(working.current||disabled||!initialized||storageError)return;
  if(action==='status'&&!pending)return;
  if(action!=='status'&&!source)return;
  if(action==='review'&&pending)return;
  if(action==='apply'&&(!review?.applyAvailable||!ack))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(action==='status'){
    const response=await api('/api/cms/migrations/journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,requestKey:pending!.requestKey})});if(!alive.current)return;
    const receipt=verifyJournalRecovery(response,pending!);if(!receipt){setMessage('No completed result is visible yet. Keep this request ID; do not start a duplicate import.');return;}await complete(receipt.length);return;
   }
   let request=pending;
   if(action==='apply'){
    request??={version:1,site,actorId,requestKey:crypto.randomUUID(),reviewDigest:review!.reviewDigest,sourceDigest:review!.plan.sourceDigest,sourceDigests:review!.plan.candidates.map(candidate=>candidate.sourceDigest)};
    // Persist before issuing a write. Storage failure prevents the API call.
    localStorage.setItem(storageKey,JSON.stringify(request));setPending(request);
   }
   const response=await api('/api/cms/migrations/journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,locale,source:source!.records,mappings,...(action==='apply'?{requestKey:request!.requestKey,reviewDigest:request!.reviewDigest}:{})})});if(!alive.current)return;
   if(action==='review'){const value=await verifyJournalReview(response,source!.records,mappings);if(alive.current){setReview(value);setAck(false);}}
   else await complete(verifyJournalReceipt(response,request!.sourceDigests).length);
  }catch(reason){if(alive.current)setError((action==='apply'?'Saving could not be confirmed. Keep the request ID and check its result before starting another import. ':'')+(reason instanceof Error?reason.message:'The request could not be completed.'));}
  finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <details className='cms-destination-migration'><summary>Import existing journal articles</summary>
  <p>Upload up to 25 existing articles from a JSON site export. Match every original image to an inspected library asset, review the drafts, then save. Existing articles are never overwritten.</p>
  <fieldset disabled={locked}><label>Journal snapshot<input ref={file} type='file' accept='.json,application/json' onChange={event=>void choose(event.target.files?.[0])}/></label><label>Import locale<input value={locale} onChange={event=>{setLocale(event.target.value);invalidate();}}/></label><p>Only English journal publication is currently supported. Other locales can be retained as drafts.</p></fieldset>
  {source&&<>{source.records.map((record,index)=><details key={index}><summary>Match images: {typeof record.title==='string'?record.title:`Article ${index+1}`}</summary>{images(record).map(({path,value})=>{
   let descriptor:SectionImage|null=null;try{descriptor=journalImageMapping(value,'placeholder');}catch{}
   return <fieldset key={path} disabled={locked}><legend>{path}</legend>{descriptor?<><p>Original alternative text: {descriptor.alt||'(empty)'}</p><p>Credit: {descriptor.credit||'(empty)'}</p><p>Original file: {String((value as {src:string}).src)}</p><MediaPicker site={site} value={mappings[source.keys[index]]?.images[path]?.assetId??''} disabled={locked} api={api} loadPreview={loadPreview} onChange={id=>mapImage(source.keys[index],path,value,id)}/></>:<p role='alert'>This image has missing or unsupported metadata. Repair the source descriptor before migration; it has not been discarded.</p>}</fieldset>;
  })}</details>)}<button type='button' disabled={locked||!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} onClick={()=>void run('review')}>Review journal import</button><button type='button' disabled={locked} onClick={discard}>Discard import review</button></>}
  {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
  {review&&<><p>{review.plan.readyDrafts} of {review.plan.count} articles can become drafts.</p>{review.plan.unusedMappings.length>0&&<p role='alert'>Remove unused mappings before saving: {review.plan.unusedMappings.join(', ')}</p>}{review.plan.candidates.map((candidate,index)=><details key={index}><summary>Review draft: {String(candidate.payload.title??`Article ${index+1}`)}</summary><p>Hero image comes from {candidate.heroSourcePath}. {candidate.retainedGalleryPaths.length} hidden gallery descriptors remain in the migration record.</p><ul>{candidate.issues.map((issue,i)=><li key={i}>{issue.severity==='error'?'Fix':'Review'} · {issue.field}: {issue.message}</li>)}</ul><button type='button' aria-expanded={preview===index} onClick={()=>setPreview(preview===index?null:index)}>{preview===index?'Close draft preview':'Preview proposed article'}</button>{preview===index&&<JournalPreview value={candidate.payload} loadPreview={loadPreview}/>}<details><summary>Original source and proposed content</summary><pre>{JSON.stringify({source:candidate.source,payload:candidate.payload},null,2)}</pre></details></details>)}<label><input type='checkbox' checked={ack} disabled={locked||!review.applyAvailable} onChange={event=>setAck(event.target.checked)}/>I reviewed the draft content, image matches and warnings.</label><button type='button' disabled={disabled||busy||storageError||Boolean(pending)||!review.applyAvailable||!ack} onClick={()=>void run('apply')}>Save reviewed article drafts</button></>}
  {pending&&<aside><p>Pending request: <code>{pending.requestKey}</code>. Only recovery identifiers are stored in this browser; uploaded content is not.</p><button type='button' disabled={disabled||busy} onClick={()=>void run('status')}>Check saved migration result</button>{source&&review&&<button type='button' disabled={disabled||busy||!ack} onClick={()=>void run('apply')}>Retry same reviewed import</button>}</aside>}
  {busy&&<p role='status'>Working…</p>}
 </details>;
}
