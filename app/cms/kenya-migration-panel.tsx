'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyKenyaReview,makePendingKenyaMigration,readPendingKenyaMigration,kenyaRecoveryKey,kenyaApplyCommand,verifyKenyaReceipt,verifyKenyaRecovery,type PendingKenyaMigration,type KenyaMigrationReview} from '../../lib/cms/kenya-migration-client';
import inventory from '../../docs/cms/kenya-source-inventory.json';
import {MediaPicker} from './media-picker';
import {PagePreviewPanel} from './page-preview-panel';
import type {LoadMediaPreview} from './media-image';
type Props={actorId:string;otherMigrationPending:boolean;onPending:(pending:boolean)=>void;onApplied:(result:{recordId:string;revisionId:string})=>Promise<void>;site:string;record:{id:string;path:string;currentRevision:string}|null;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview};
export function KenyaMigrationPanel({site,actorId,otherMigrationPending,onPending,onApplied,record,disabled,api,loadPreview}:Props){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[assets,setAssets]=useState<string[]>(inventory.media.map(()=>'')),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<KenyaMigrationReview|null>(null);
 const [pending,setPending]=useState<PendingKenyaMigration|null>(null),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[message,setMessage]=useState('');
 const key=kenyaRecoveryKey(site,actorId);
 useEffect(()=>{try{const saved=readPendingKenyaMigration(localStorage.getItem(key),site,actorId);setPending(saved);if(saved)setOpen(true);}catch{setStorageError(true);setError('Recovery data could not be read. Ask an administrator to check this Kenya migration before saving again.');}setReady(true);},[key,site,actorId]);
 useEffect(()=>onPending(!ready||busy||Boolean(review)||Boolean(pending)||storageError),[ready,busy,review,pending,storageError,onPending]);
 const generation=useRef(0),alive=useRef(true),working=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{generation.current++;setReview(null);setAck(false);setError('');},[record?.id,record?.currentRevision,site]);
 const existing=record?.path==='/destinations/kenya'?record:null,locked=disabled||otherMigrationPending||busy||!ready||storageError||Boolean(pending);
 function invalidate(){generation.current++;setReview(null);setAck(false);setError('');setMessage('');}
 async function check(){if(locked||working.current)return;working.current=true;const at=++generation.current;setBusy(true);setReview(null);setAck(false);setError('');try{
  if(mode==='selected'&&!existing)throw Error('Select the existing Kenya page first.');
  const selection={site,recordId:mode==='selected'?existing!.id:null,expectedRevision:mode==='selected'?existing!.currentRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:assets[i]}))};
  const result=await verifyKenyaReview(await api('/api/cms/migrations/kenya',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review',...selection})}),selection);
  if(alive.current&&generation.current===at)setReview(result);
 }catch(e){if(alive.current&&generation.current===at)setError(e instanceof Error?e.message:'Unable to review Kenya content.');}finally{working.current=false;if(alive.current)setBusy(false);}} async function saveOrRecover(action:'apply'|'status'){
  if(disabled||working.current||!ready||storageError||(!pending&&(otherMigrationPending||!review||!ack||!review.applyAvailable)))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(!navigator.locks)throw Error('This browser cannot safely coordinate saves across tabs. Use a browser with Web Locks support.');
   await navigator.locks.request(key,async()=>{
    if(!alive.current)return;
    const stored=readPendingKenyaMigration(localStorage.getItem(key),site,actorId);
    let request=pending;
    if(stored){if(request&&JSON.stringify(stored)!==JSON.stringify(request))throw Error('Another Kenya request is pending in this account. Reload to recover it.');request=stored;}
    if(!request){request=await makePendingKenyaMigration(actorId,(({action,...selection})=>selection)(review!.selection),review!,crypto.randomUUID());localStorage.setItem(key,JSON.stringify(request));}
    // Retain the in-memory identity if another tab already acknowledged this request.
    setPending(request);
    const response=await api('/api/cms/migrations/kenya',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{action,site,requestKey:request.requestKey}:kenyaApplyCommand(request))});
    if(!alive.current)return;
    const result=action==='status'?verifyKenyaRecovery(response,request):verifyKenyaReceipt(response,request);
    if(!result){setMessage('No completed result is visible yet. Keep this request and check again or retry it.');return;}
    // Keep recovery until the saved record has actually loaded in the workspace.
    await onApplied(result);if(!alive.current)return;
    const current=readPendingKenyaMigration(localStorage.getItem(key),site,actorId);
    if(current&&JSON.stringify(current)!==JSON.stringify(request))throw Error('Another request is stored. Reload before continuing.');
    if(current)localStorage.removeItem(key);
    setPending(null);setReview(null);setAck(false);setMessage('Kenya draft saved and loaded. Nothing was published.');
   });
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Unable to complete this Kenya migration. Keep the request and check its result.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <section className='cms-migration-panel' aria-label='Kenya content migration'><button type='button' aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close Kenya migration review':'Review existing Kenya content'}</button>{open&&<><h3>Review the existing Kenya page</h3><p>Map each original photograph to its processed library image. This review does not save or publish content.</p><label>Kenya migration target<select value={mode} disabled={locked} onChange={e=>{invalidate();setMode(e.target.value);}}><option value='create'>New Kenya page draft</option><option value='selected' disabled={!existing}>Selected Kenya page</option></select></label>{inventory.media.map((m,i)=><fieldset key={m.sourcePath} disabled={locked}><legend>Kenya photograph {i+1}</legend><p>{m.sourcePath}</p><MediaPicker site={site} value={assets[i]} disabled={locked} api={api} loadPreview={loadPreview} onChange={id=>{invalidate();setAssets(values=>values.map((v,index)=>index===i?id:v));}}/></fieldset>)}<button type='button' disabled={locked||assets.some(a=>!a)||new Set(assets).size!==8} onClick={()=>void check()}>{busy?'Checking Kenya content…':'Check Kenya migration'}</button>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&!disabled&&<><p role='status'>{review.verification.verified?'All eight photographs passed current source, processing and rights checks.':'Some photographs failed verification. Review their processing and rights.'}</p><ul>{review.verification.evidence.map((e,i)=><li key={e.assetId}>Photograph {i+1}: {e.available?'Available':'Unavailable'}</li>)}</ul><ul>{review.findings.map((f,i)=><li key={i}>{f.message}</li>)}</ul><p>{review.notice}</p><PagePreviewPanel websiteId={site} value={review.proposal.composition} loadPreview={loadPreview} locale='en'/><details><summary>Proposed Kenya search metadata</summary><pre>{JSON.stringify(review.proposal.seo,null,2)}</pre></details><label><input type='checkbox' checked={ack} disabled={locked||!review.applyAvailable} onChange={e=>setAck(e.target.checked)}/>I reviewed the Kenya copy, images and SEO. Save this as a draft only.</label><button type='button' disabled={locked||!ack||!review.applyAvailable} onClick={()=>void saveOrRecover('apply')}>Apply reviewed Kenya draft</button><button type='button' disabled={locked} onClick={invalidate}>Discard Kenya review</button></>}{pending&&<aside aria-label='Pending Kenya migration'><p>This save request is retained for this account and website. Recovery stores identifiers and evidence, not page copy or credentials.</p><code>{pending.requestKey}</code><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('status')}>Check Kenya migration result</button><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('apply')}>Retry same Kenya migration</button></aside>}</>}</section>;
}
