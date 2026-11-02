'use client';
import {useEffect,useRef,useState} from 'react';
import inventory from '../../docs/cms/guided-safaris-migration-inventory.json';
import {guidedRecoveryKey,readPendingGuidedMigration,verifyGuidedReview,makePendingGuidedMigration,guidedApplyCommand,verifyGuidedReceipt,verifyGuidedRecovery,type GuidedMigrationReview,type GuidedMigrationSelection,type PendingGuidedMigration} from '../../lib/cms/guided-migration-client';
import {CompositionPreview} from './composition-preview';
import {MediaPicker} from './media-picker';
import type {LoadMediaPreview} from './media-image';
type Props={site:string;actorId:string;record:{id:string;path:string;currentRevision:string}|null;disabled:boolean;otherMigrationPending?:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;onPending:(pending:boolean)=>void;onApplied:(result:{recordId:string;revisionId:string})=>Promise<void>};
export function GuidedMigrationPanel({site,actorId,record,disabled,otherMigrationPending=false,api,loadPreview,onPending,onApplied}:Props){
 const [mode,setMode]=useState<'create'|'selected'>('create'),[assets,setAssets]=useState<string[]>(inventory.media.map(()=>'')),[review,setReview]=useState<{value:GuidedMigrationReview;selection:GuidedMigrationSelection}|null>(null),[pending,setPending]=useState<PendingGuidedMigration|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),working=useRef(false),generation=useRef(0),key=guidedRecoveryKey(site,actorId);
 useEffect(()=>{alive.current=true;try{setPending(readPendingGuidedMigration(localStorage.getItem(key),site,actorId));}catch{setStorageError(true);setError('Recovery data could not be read. Ask an administrator to check the pending Bespoke migration.');}setReady(true);return()=>{alive.current=false;generation.current++;};},[key,site,actorId]);
 useEffect(()=>{generation.current++;setReview(null);setAck(false);},[record?.id,record?.currentRevision]);
 useEffect(()=>onPending(!ready||busy||Boolean(review)||Boolean(pending)||storageError),[ready,busy,review,pending,storageError,onPending]);
 const existing=record?.path==='/guided-bespoke-safaris'?record:null,locked=disabled||otherMigrationPending||busy||!ready||storageError||Boolean(pending);
 function invalidate(){generation.current++;setReview(null);setAck(false);setError('');setMessage('');}
 async function complete(result:{recordId:string;revisionId:string}){localStorage.removeItem(key);setPending(null);setReview(null);setAck(false);setMessage('Bespoke draft saved. Nothing was published.');try{await onApplied(result);}catch{if(alive.current)setMessage('Bespoke draft saved. Refresh the page list to see it.');}}
 async function execute(action:'review'|'apply'|'status'){
  if(disabled||working.current||!ready||storageError||(action==='status'&&!pending)||(action==='review'&&(pending||otherMigrationPending))||(action==='apply'&&!pending&&(otherMigrationPending||!review||!ack||!review.value.applyAvailable)))return;
  working.current=true;setBusy(true);setError('');setMessage('');const current=generation.current;
  try{
   if(action==='review'){
    if(mode==='selected'&&!existing)throw Error('Select the existing Bespoke page first.');
    const selection:GuidedMigrationSelection={recordId:mode==='selected'?existing!.id:null,expectedRevision:mode==='selected'?existing!.currentRevision:null,bindings:inventory.media.map((source,index)=>({sourcePath:source.sourcePath,sourceSha256:source.sha256,assetId:assets[index]}))};
    const response=await api('/api/cms/migrations/guided',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...selection})});
    const value=await verifyGuidedReview(response,site,selection);if(alive.current&&generation.current===current){setReview({value,selection});setAck(false);}return;
   }
   let request=pending;
   if(!request){request=makePendingGuidedMigration(site,actorId,review!.selection,review!.value,crypto.randomUUID());localStorage.setItem(key,JSON.stringify(request));setPending(request);}
   const response=await api('/api/cms/migrations/guided',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{action,site,requestKey:request.requestKey}:guidedApplyCommand(request))});
   if(!alive.current)return;
   const result=action==='status'?verifyGuidedRecovery(response,request):verifyGuidedReceipt(response,request);
   if(!result){setMessage('No completed result is visible yet. Keep this request and check again or retry the same request.');return;}
   await complete(result);
  }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Bespoke migration is unavailable.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <details className='cms-destination-migration'><summary>Import existing Bespoke Safaris content</summary><p>Match the eight original images to processed library images, then review the complete Bespoke page. Applying creates or replaces a draft; revision history and the published version are retained.</p>
 <fieldset disabled={locked||Boolean(review)}><legend>Bespoke migration destination and images</legend><label>Bespoke destination<select value={mode} onChange={event=>{invalidate();setMode(event.target.value as 'create'|'selected');}}><option value='create'>Create a new Bespoke page</option><option value='selected' disabled={!existing}>Replace selected Bespoke draft</option></select></label>{mode==='selected'&&<p>{existing?'Selected /guided-bespoke-safaris draft':'Select /guided-bespoke-safaris in the page list.'}</p>}
 {inventory.media.map((source,index)=><fieldset key={source.sourcePath}><legend>{`Original image ${index+1}`}</legend><p>Original image: {source.sourcePath.split('/').at(-1)}</p><p>Choose the processed upload made from this original image. Review checks its source fingerprint and current rights.</p><MediaPicker site={site} value={assets[index]} disabled={locked||Boolean(review)} api={api} loadPreview={loadPreview} onChange={id=>{invalidate();setAssets(values=>values.map((value,i)=>i===index?id:value));}}/></fieldset>)}
 <button type='button' disabled={assets.some(asset=>!asset)||new Set(assets).size!==8} onClick={()=>void execute('review')}>Review Bespoke migration</button></fieldset>
 {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
 {review&&<><p>{review.value.notice}</p>{review.value.findings.length>0&&<ul>{review.value.findings.map((finding,index)=><li key={index}>{finding.message}</li>)}</ul>}<details><summary>Current Bespoke draft</summary>{review.value.before?<><CompositionPreview value={review.value.before.composition} locale='en' now={new Date()} loadPreview={loadPreview}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(review.value.before.seo??{},null,2)}</pre></>:<p>A new Bespoke page will be created.</p>}</details><details><summary>Proposed Bespoke content</summary><CompositionPreview value={review.value.proposal.composition} locale='en' now={new Date()} loadPreview={loadPreview}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(review.value.proposal.seo??{},null,2)}</pre></details><label><input type='checkbox' checked={ack} disabled={locked||!review.value.applyAvailable} onChange={event=>setAck(event.target.checked)}/>I reviewed the copy, images, layout, SEO and draft replacement. The draft will still need editorial approval before publication.</label><button type='button' disabled={locked||!ack||!review.value.applyAvailable} onClick={()=>void execute('apply')}>Apply reviewed Bespoke draft</button><button type='button' disabled={locked} onClick={invalidate}>Discard Bespoke review</button></>}
 {pending&&<aside><p>Pending Bespoke migration: <code style={{overflowWrap:'anywhere'}}>{pending.requestKey}</code>. Recovery identifiers and image evidence are saved for this account and website; page copy is not stored in the browser.</p><button type='button' disabled={disabled||busy||storageError} onClick={()=>void execute('status')}>Check Bespoke migration result</button><button type='button' disabled={disabled||busy||storageError} onClick={()=>void execute('apply')}>Retry same Bespoke migration</button></aside>}{busy&&<p role='status'>Working…</p>}</details>;
}
