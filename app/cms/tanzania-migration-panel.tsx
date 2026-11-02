'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyTanzaniaReview,makePendingTanzaniaMigration,readPendingTanzaniaMigration,tanzaniaRecoveryKey,tanzaniaApplyCommand,verifyTanzaniaReceipt,verifyTanzaniaRecovery,type PendingTanzaniaMigration,type TanzaniaMigrationReview} from '../../lib/cms/tanzania-migration-client';
import inventory from '../../docs/cms/tanzania-source-inventory.json';
import {MediaPicker} from './media-picker';
import {PagePreviewPanel} from './page-preview-panel';
import type {LoadMediaPreview} from './media-image';
type Props={actorId:string;otherMigrationPending:boolean;onPending:(pending:boolean)=>void;onApplied:(result:{recordId:string;revisionId:string})=>Promise<void>;site:string;record:{id:string;path:string;currentRevision:string}|null;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview};
export function TanzaniaMigrationPanel({site,actorId,otherMigrationPending,onPending,onApplied,record,disabled,api,loadPreview}:Props){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[assets,setAssets]=useState<string[]>(inventory.media.map(()=>'')),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<TanzaniaMigrationReview|null>(null);
 const [pending,setPending]=useState<PendingTanzaniaMigration|null>(null),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[message,setMessage]=useState('');
 const key=tanzaniaRecoveryKey(site,actorId);
 useEffect(()=>{try{const saved=readPendingTanzaniaMigration(localStorage.getItem(key),site,actorId);setPending(saved);if(saved)setOpen(true);}catch{setStorageError(true);setError('Recovery data could not be read. Ask an administrator to check this Tanzania migration before saving again.');}setReady(true);},[key,site,actorId]);
 useEffect(()=>onPending(!ready||busy||Boolean(review)||Boolean(pending)||storageError),[ready,busy,review,pending,storageError,onPending]);
 const generation=useRef(0),alive=useRef(true),working=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{generation.current++;setReview(null);setAck(false);setError('');},[record?.id,record?.currentRevision,site]);
 const existing=record?.path==='/destinations/tanzania'?record:null,locked=disabled||otherMigrationPending||busy||!ready||storageError||Boolean(pending);
 function invalidate(){generation.current++;setReview(null);setAck(false);setError('');setMessage('');}
 async function check(){if(locked||working.current)return;working.current=true;const at=++generation.current;setBusy(true);setReview(null);setAck(false);setError('');try{
  if(mode==='selected'&&!existing)throw Error('Select the existing Tanzania page first.');
  const selection={site,recordId:mode==='selected'?existing!.id:null,expectedRevision:mode==='selected'?existing!.currentRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:assets[i]}))};
  const result=await verifyTanzaniaReview(await api('/api/cms/migrations/tanzania',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review',...selection})}),selection);
  if(alive.current&&generation.current===at)setReview(result);
 }catch(e){if(alive.current&&generation.current===at)setError(e instanceof Error?e.message:'Unable to review Tanzania content.');}finally{working.current=false;if(alive.current)setBusy(false);}} async function saveOrRecover(action:'apply'|'status'){
  if(disabled||working.current||!ready||storageError||(!pending&&(otherMigrationPending||!review||!ack||!review.applyAvailable)))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(!navigator.locks)throw Error('This browser cannot safely coordinate saves across tabs. Use a browser with Web Locks support.');
   await navigator.locks.request(key,async()=>{
    if(!alive.current)return;
    const stored=readPendingTanzaniaMigration(localStorage.getItem(key),site,actorId);
    let request=pending;
    if(stored){if(request&&JSON.stringify(stored)!==JSON.stringify(request))throw Error('Another Tanzania request is pending in this account. Reload to recover it.');request=stored;}
    if(!request){request=await makePendingTanzaniaMigration(actorId,(({action,...selection})=>selection)(review!.selection),review!,crypto.randomUUID());localStorage.setItem(key,JSON.stringify(request));}
    // Retain the in-memory identity if another tab already acknowledged this request.
    setPending(request);
    const response=await api('/api/cms/migrations/tanzania',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{action,site,requestKey:request.requestKey}:tanzaniaApplyCommand(request))});
    if(!alive.current)return;
    const result=action==='status'?verifyTanzaniaRecovery(response,request):verifyTanzaniaReceipt(response,request);
    if(!result){setMessage('No completed result is visible yet. Keep this request and check again or retry it.');return;}
    // Keep recovery until the saved record has actually loaded in the workspace.
    await onApplied(result);if(!alive.current)return;
    const current=readPendingTanzaniaMigration(localStorage.getItem(key),site,actorId);
    if(current&&JSON.stringify(current)!==JSON.stringify(request))throw Error('Another request is stored. Reload before continuing.');
    if(current)localStorage.removeItem(key);
    setPending(null);setReview(null);setAck(false);setMessage('Tanzania draft saved and loaded. Nothing was published.');
   });
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Unable to complete this Tanzania migration. Keep the request and check its result.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <section className='cms-migration-panel' aria-label='Tanzania content migration'><button type='button' aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close Tanzania migration review':'Review existing Tanzania content'}</button>{open&&<><h3>Review the existing Tanzania page</h3><p>Map each original photograph to its processed library image. This review does not save or publish content.</p><label>Tanzania migration target<select value={mode} disabled={locked} onChange={e=>{invalidate();setMode(e.target.value);}}><option value='create'>New Tanzania page draft</option><option value='selected' disabled={!existing}>Selected Tanzania page</option></select></label>{inventory.media.map((m,i)=><fieldset key={m.sourcePath} disabled={locked}><legend>Tanzania photograph {i+1}</legend><p>{m.sourcePath}</p><MediaPicker site={site} value={assets[i]} disabled={locked} api={api} loadPreview={loadPreview} onChange={id=>{invalidate();setAssets(values=>values.map((v,index)=>index===i?id:v));}}/></fieldset>)}<button type='button' disabled={locked||assets.some(a=>!a)||new Set(assets).size!==12} onClick={()=>void check()}>{busy?'Checking Tanzania content…':'Check Tanzania migration'}</button>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&!disabled&&<><p role='status'>{review.verification.verified?'All twelve photographs passed current source, processing and rights checks.':'Some photographs failed verification. Review their processing and rights.'}</p><ul>{review.verification.evidence.map((e,i)=><li key={e.assetId}>Photograph {i+1}: {e.available?'Available':'Unavailable'}</li>)}</ul><ul>{review.findings.map((f,i)=><li key={i}>{f.message}</li>)}</ul><p>{review.notice}</p><PagePreviewPanel websiteId={site} value={review.proposal.composition} loadPreview={loadPreview} locale='en'/><details><summary>Proposed Tanzania search metadata</summary><pre>{JSON.stringify(review.proposal.seo,null,2)}</pre></details><label><input type='checkbox' checked={ack} disabled={locked||!review.applyAvailable} onChange={e=>setAck(e.target.checked)}/>I reviewed the Tanzania copy, images and SEO. Save this as a draft only.</label><button type='button' disabled={locked||!ack||!review.applyAvailable} onClick={()=>void saveOrRecover('apply')}>Apply reviewed Tanzania draft</button><button type='button' disabled={locked} onClick={invalidate}>Discard Tanzania review</button></>}{pending&&<aside aria-label='Pending Tanzania migration'><p>This save request is retained for this account and website. Recovery stores identifiers and evidence, not page copy or credentials.</p><code>{pending.requestKey}</code><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('status')}>Check Tanzania migration result</button><button type='button' disabled={disabled||busy||storageError} onClick={()=>void saveOrRecover('apply')}>Retry same Tanzania migration</button></aside>}</>}</section>;
}
