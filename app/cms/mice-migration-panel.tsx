'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyMiceReview,makePendingMiceMigration,readPendingMiceMigration,miceRecoveryKey,miceApplyCommand,verifyMiceReceipt,verifyMiceRecovery,type MiceMigrationReview,type MiceMigrationSelection,type PendingMiceMigration} from '../../lib/cms/mice-migration-client';
import inventory from '../../docs/cms/mice-migration-inventory.json';
import {MediaPicker} from './media-picker';
import {RecordPicker} from './record-picker';
import {CompositionPreview} from './composition-preview';
import type {LoadMediaPreview} from './media-image';
type Props={actorId:string;otherMigrationPending:boolean;onPending:(pending:boolean)=>void;onApplied:(result:{recordId:string;revisionId:string})=>Promise<void>;site:string;record:{id:string;path:string;currentRevision:string}|null;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview};
export function MiceMigrationPanel({site,actorId,otherMigrationPending,onPending,onApplied,record,disabled,api,loadPreview}:Props){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[assets,setAssets]=useState<string[]>(inventory.media.map(()=>'')),[forms,setForms]=useState<{recordId:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [review,setReview]=useState<{response:MiceMigrationReview;selection:MiceMigrationSelection;verified:boolean}|null>(null);
 const [pending,setPending]=useState<PendingMiceMigration|null>(null),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[message,setMessage]=useState('');
 const key=miceRecoveryKey(site,actorId),working=useRef(false);
 useEffect(()=>{try{const saved=readPendingMiceMigration(localStorage.getItem(key),site,actorId);setPending(saved);if(saved)setOpen(true);}catch{setStorageError(true);setError('Recovery data could not be read. Ask an administrator to check this MICE migration before saving again.');}setReady(true);},[key,site,actorId]);
 useEffect(()=>onPending(!ready||busy||Boolean(review)||Boolean(pending)||storageError),[ready,busy,review,pending,storageError,onPending]);
 const generation=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{generation.current++;setReview(null);setAck(false);setError('');},[record?.id,record?.currentRevision,site]);
 const locked=disabled||otherMigrationPending||busy||!ready||storageError||Boolean(pending),existing=record?.path==='/mice'?record:null;
 function invalidate(){generation.current++;setReview(null);setAck(false);setError('');setMessage('');}
 async function requestReview(){if(locked||working.current)return;working.current=true;const at=++generation.current;setBusy(true);setReview(null);setAck(false);setError('');try{
  if(mode==='selected'&&!existing)throw Error('Select the existing MICE page first.');
  const selection={site,recordId:mode==='selected'?existing!.id:null,expectedRevision:mode==='selected'?existing!.currentRevision:null,formId:forms[0]?.recordId??null,bindings:inventory.media.map((item,i)=>({sourcePath:item.sourcePath,sourceSha256:item.sha256,assetId:assets[i]}))};
  const {site:selectionSite,...selected}=selection;
  const response=await verifyMiceReview(await api('/api/cms/migrations/mice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review',...selection})}),selectionSite,selected);
  if(alive.current&&generation.current===at)setReview({response,selection:selected,verified:response.verification.verified});
 }catch(e){if(alive.current&&generation.current===at)setError(e instanceof Error?e.message:'Unable to review MICE migration.');}finally{working.current=false;if(alive.current)setBusy(false);}}
 async function saveOrRecover(action:'apply'|'status'){
  if(disabled||working.current||!ready||storageError||(!pending&&(otherMigrationPending||!review||!ack||!review.response.applyAvailable)))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(!navigator.locks)throw Error('This browser cannot safely coordinate saves across tabs. Use a browser with Web Locks support.');
   await navigator.locks.request(key,async()=>{
    if(!alive.current)return;
    const stored=readPendingMiceMigration(localStorage.getItem(key),site,actorId);
    let request=pending;
    if(stored){if(request&&JSON.stringify(stored)!==JSON.stringify(request))throw Error('Another MICE request is pending in this account. Reload to recover it.');request=stored;}
    if(!request){request=await makePendingMiceMigration(site,actorId,review!.selection,review!.response,crypto.randomUUID());localStorage.setItem(key,JSON.stringify(request));}
    // Retain the in-memory identity if another tab already acknowledged this request.
    setPending(request);
    const response=await api('/api/cms/migrations/mice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{action,site,requestKey:request.requestKey}:miceApplyCommand(request))});
    if(!alive.current)return;
    const result=action==='status'?verifyMiceRecovery(response,request):verifyMiceReceipt(response,request);
    if(!result){setMessage('No completed result is visible yet. Keep this request and check again or retry it.');return;}
    // Keep recovery until the saved record has actually loaded in the workspace.
    await onApplied(result);if(!alive.current)return;
    const current=readPendingMiceMigration(localStorage.getItem(key),site,actorId);
    if(current&&JSON.stringify(current)!==JSON.stringify(request))throw Error('Another request is stored. Reload before continuing.');
    if(current)localStorage.removeItem(key);
    setPending(null);setReview(null);setAck(false);setMessage('MICE draft saved and loaded. Nothing was published.');
   });
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Unable to complete this MICE migration. Keep the request and check its result.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <section className='cms-migration-panel' aria-label='MICE content migration'><button type='button' aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close MICE migration review':'Review existing MICE content'}</button>{open&&<><h3>Review the existing MICE page</h3><p>Select the processed copies of the original images. This review does not save, replace or publish content.</p><label>Migration target<select disabled={locked} value={mode} onChange={e=>{invalidate();setMode(e.target.value);}}><option value='create'>New MICE page draft</option><option value='selected' disabled={!existing}>Selected MICE page</option></select></label>{inventory.media.map((item,i)=><fieldset key={item.sourcePath} disabled={locked}><legend>{i===0?'India heritage image':'Kenya landscape image'}</legend><p>{item.sourcePath.split('/').pop()}</p><MediaPicker site={site} value={assets[i]} disabled={locked} api={api} loadPreview={loadPreview} onChange={id=>{invalidate();setAssets(values=>values.map((v,index)=>index===i?id:v));}}/></fieldset>)}<fieldset disabled={locked}><legend>Corporate enquiry form (optional during review)</legend><RecordPicker type='form' max={1} context={{site,api,disabled:locked}} value={forms} onChange={next=>{invalidate();setForms(next);}}/><p>Review checks the selected published form’s corporate fields and consent. Unpublished drafts cannot satisfy this check.</p></fieldset><button type='button' disabled={locked||assets.some(a=>!a)||new Set(assets).size!==assets.length} onClick={()=>void requestReview()}>{busy?'Checking MICE content…':'Check MICE migration'}</button>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&<><p role='status'>{review.verified?'Both original images passed current source, processing and rights checks.':'Some images failed verification. Review their processing and rights.'}</p><ul>{review.response.findings.map((finding,i)=><li key={i}>{finding.message}</li>)}</ul><p>{review.response.notice}</p><details><summary>Proposed MICE page</summary><CompositionPreview websiteId={site} value={review.response.proposal.composition} loadPreview={loadPreview} loadRecord={async(id,signal)=>(await api(`/api/cms/content?site=${site}&record=${id}`,{signal})).record} locale='en' now={new Date()}/></details><details><summary>Proposed search metadata</summary><pre>{JSON.stringify(review.response.proposal.seo,null,2)}</pre></details><label><input type='checkbox' checked={ack} disabled={locked||!review.response.applyAvailable} onChange={e=>setAck(e.target.checked)}/>I reviewed the copy, images, corporate form and SEO. Save this as a draft only.</label><button type='button' disabled={locked||!ack||!review.response.applyAvailable} onClick={()=>void saveOrRecover('apply')}>Apply reviewed MICE draft</button><button type='button' disabled={locked} onClick={invalidate}>Discard MICE review</button></>}{pending&&<aside aria-label='Pending MICE migration'><p>This save request is retained for this account and website. Recovery stores identifiers and evidence, not page copy or credentials.</p><code>{pending.requestKey}</code><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('status')}>Check MICE migration result</button><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('apply')}>Retry same MICE migration</button></aside>}</>}</section>;
}
