'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {parseExpeditionSnapshot,parseExpeditionMappings,verifyExpeditionReview,verifyExpeditionReceipt,readPendingExpeditionMigration,verifyExpeditionRecovery,expeditionRecoveryKey,type ExpeditionSnapshot,type ExpeditionMigrationMappings,type ExpeditionMigrationReview,type PendingExpeditionMigration} from '../../lib/cms/photo-expedition-migration-client';
import {PhotoExpeditionPreview} from './photo-expedition-preview';
import type {LoadMediaPreview} from './media-image';
type Props={site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;disabled:boolean;onPending:(value:boolean)=>void;onApplied:()=>Promise<void>};
export function PhotoExpeditionMigrationPanel({site,actorId,api,loadPreview,disabled,onPending,onApplied}:Props){
 const [source,setSource]=useState<ExpeditionSnapshot|null>(null),[maps,setMaps]=useState<ExpeditionMigrationMappings>({}),[review,setReview]=useState<ExpeditionMigrationReview|null>(null),[pending,setPending]=useState<PendingExpeditionMigration|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),working=useRef(false),sourceInput=useRef<HTMLInputElement>(null),mappingInput=useRef<HTMLInputElement>(null),storageKey=expeditionRecoveryKey(site,actorId);
 useEffect(()=>{alive.current=true;try{setPending(readPendingExpeditionMigration(localStorage.getItem(storageKey),site,actorId));}catch{setStorageError(true);setError('Recovery data could not be read. Ask your administrator to check the pending import before continuing.');}setReady(true);return()=>{alive.current=false;};},[storageKey,site,actorId]);
 useEffect(()=>onPending(!ready||Boolean(source)||Boolean(pending)||Object.keys(maps).length>0||busy||storageError),[ready,source,pending,maps,busy,storageError,onPending]);
 const locked=disabled||busy||!ready||storageError||Boolean(pending);
 function invalidate(){setReview(null);setAck(false);setError('');setMessage('');}
 async function choose(file:File|undefined,kind:'source'|'mapping'){
  if(locked||working.current||!file)return;working.current=true;setBusy(true);invalidate();
  if(kind==='source'){setSource(null);setMaps({});if(mappingInput.current)mappingInput.current.value='';}else setMaps({});
  try{if(file.size>(kind==='source'?1_000_000:500_000))throw Error(kind==='source'?'Choose a snapshot under 1 MB.':'Choose mappings under 500 KB.');const text=await file.text();if(!alive.current)return;if(kind==='source')setSource(parseExpeditionSnapshot(text));else setMaps(parseExpeditionMappings(text));}
  catch(e){if(alive.current)setError(e instanceof z.ZodError?`Check the ${kind==='source'?'source snapshot':'mapping file'}: ${e.issues.slice(0,5).map(issue=>`${issue.path.join('.')||'File'}: ${issue.message}`).join('; ')}`:e instanceof Error?e.message:'Unable to read this file.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 function clear(){setSource(null);setMaps({});setReview(null);setAck(false);if(sourceInput.current)sourceInput.current.value='';if(mappingInput.current)mappingInput.current.value='';}
 async function complete(count:number){
  // Keep recovery available if browser storage cannot be cleared after a successful write.
  localStorage.removeItem(storageKey);setPending(null);clear();setMessage(`${count} expedition drafts saved. Nothing was published.`);
  try{await onApplied();}catch{if(alive.current)setMessage(`${count} expedition drafts saved. Refresh the expedition list to see them.`);}
 }
 async function execute(action:'review'|'apply'|'status'){
  if(working.current||disabled||!ready||storageError||action==='status'&&!pending||action!=='status'&&!source||action==='review'&&pending||action==='apply'&&(!review?.applyAvailable||!ack))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(action==='status'){
    const response=await api('/api/cms/migrations/expeditions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,requestKey:pending!.requestKey})});if(!alive.current)return;
    const result=verifyExpeditionRecovery(response,pending!);if(!result){setMessage('No completed result is visible yet. Keep this request and check again before starting another import.');return;}await complete(result.length);return;
   }
   let request=pending;
   if(action==='apply'){
    request??={version:1,site,actorId,requestKey:crypto.randomUUID(),sourceDigest:review!.plan.sourceDigest,reviewDigest:review!.reviewDigest,sourceKeys:review!.plan.candidates.map(item=>item.sourceKey)};
    localStorage.setItem(storageKey,JSON.stringify(request));setPending(request);
   }
   const response=await api('/api/cms/migrations/expeditions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,locale:'en',source,mappings:maps,...(action==='apply'?{requestKey:request!.requestKey,reviewDigest:request!.reviewDigest}:{})})});if(!alive.current)return;
   if(action==='review'){const result=await verifyExpeditionReview(response,source!,maps);if(alive.current){setReview(result);setAck(false);}}
   else await complete(verifyExpeditionReceipt(response,request!.sourceKeys).length);
  }catch(e){if(alive.current)setError((action==='apply'?'Saving could not be confirmed. Keep the request and check its result. ':'')+(e instanceof Error?e.message:'Request failed.'));}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <details className='cms-destination-migration'><summary>Import existing photography expeditions</summary>
 <p>Administrator migration: upload a JSON expedition snapshot and reviewed mapping file. The mappings must include inspected images, hero and gallery choices, additional FAQs, booking copy and an enquiry form. Existing records are never overwritten. For everyday changes, use the expedition editor.</p>
 <fieldset disabled={locked}><legend>Migration files</legend><label>Expedition source snapshot<input ref={sourceInput} type='file' accept='.json,application/json' onChange={e=>void choose(e.target.files?.[0],'source')}/></label><label>Reviewed expedition mappings<input ref={mappingInput} type='file' accept='.json,application/json' disabled={!source} onChange={e=>void choose(e.target.files?.[0],'mapping')}/></label></fieldset>
 {source&&<><p>{source.length} source expeditions loaded · {Object.keys(maps).length} reviewed mappings loaded · English</p><button type='button' disabled={locked} onClick={()=>void execute('review')}>Review expedition import</button></>}
 {(source||Object.keys(maps).length>0)&&<button type='button' disabled={locked} onClick={()=>{clear();invalidate();}}>Discard expedition import review</button>}
 {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
 {review&&<><p>{review.plan.readyDrafts} of {review.plan.count} expeditions can become drafts.</p>{review.plan.unusedMappings.length>0&&<p>Remove unused mappings: {review.plan.unusedMappings.join(', ')}</p>}
 {review.plan.candidates.map((item,index)=><details key={`${item.sourceKey}:${index}`}><summary>Review expedition: {String(item.payload.title??`Expedition ${index+1}`)}</summary><ul>{item.issues.map((issue,i)=><li key={i}>{issue.severity} · {issue.field}: {issue.message}</li>)}</ul><PhotoExpeditionPreview value={item.payload} loadPreview={loadPreview}/></details>)}
 <label><input type='checkbox' disabled={locked||!review.applyAvailable} checked={ack} onChange={e=>setAck(e.target.checked)}/>I reviewed the expedition content, image choices, dates, booking terms, form mapping and warnings.</label><button type='button' disabled={locked||!review.applyAvailable||!ack} onClick={()=>void execute('apply')}>Save reviewed expedition drafts</button></>}
 {pending&&<aside><p>Pending expedition import: <code style={{overflowWrap:'anywhere'}}>{pending.requestKey}</code>. Recovery identifiers are saved in this browser; source content is not.</p><button type='button' disabled={disabled||busy||storageError} onClick={()=>void execute('status')}>Check expedition import result</button>{source&&review&&<button type='button' disabled={disabled||busy||storageError||!ack} onClick={()=>void execute('apply')}>Retry same expedition import</button>}</aside>}{busy&&<p role='status'>Working…</p>}
 </details>;
}
