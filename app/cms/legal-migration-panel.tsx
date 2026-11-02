'use client';
import {useEffect,useRef,useState} from 'react';
import {legalPaths,type LegalPath} from '../../lib/cms/legal-page';
import {legalRecoveryKey,readPendingLegalMigration,verifyLegalReview,verifyLegalReceipt,verifyLegalRecovery,type LegalMigrationReview,type PendingLegalMigration} from '../../lib/cms/legal-migration-client';
import {CompositionPreview} from './composition-preview';
import type {LoadMediaPreview} from './media-image';
type Props={site:string;actorId:string;record:{id:string;path:string;currentRevision:string}|null;disabled:boolean;otherMigrationPending?:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;onPending:(value:boolean)=>void;onApplied:()=>Promise<void>};
export function LegalMigrationPanel({site,actorId,record,disabled,otherMigrationPending=false,api,loadPreview,onPending,onApplied}:Props){
 const [path,setPath]=useState<LegalPath>('/legal/privacy'),[mode,setMode]=useState<'create'|'selected'>('create'),[review,setReview]=useState<LegalMigrationReview|null>(null),[pending,setPending]=useState<PendingLegalMigration|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[storageError,setStorageError]=useState(false),[ack,setAck]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),working=useRef(false),key=legalRecoveryKey(site,actorId);
 useEffect(()=>{alive.current=true;try{setPending(readPendingLegalMigration(localStorage.getItem(key),site,actorId));}catch{setStorageError(true);setError('Recovery data could not be read. Ask an administrator to check the pending migration.');}setReady(true);return()=>{alive.current=false;};},[key,site,actorId]);
 useEffect(()=>{setReview(null);setAck(false);},[record?.id,record?.currentRevision,mode,path]);
 useEffect(()=>onPending(!ready||busy||Boolean(review)||Boolean(pending)||storageError),[ready,busy,review,pending,storageError,onPending]);
 const existing=record&&legalPaths.some(path=>path===record.path)?record:null;
 const locked=disabled||otherMigrationPending||busy||!ready||storageError||Boolean(pending);
 async function complete(){localStorage.removeItem(key);setPending(null);setReview(null);setAck(false);setMessage('Legal draft saved. Nothing was published.');try{await onApplied();}catch{if(alive.current)setMessage('Legal draft saved. Refresh the page list to see it.');}}
 async function execute(action:'review'|'apply'|'status'){
  if(otherMigrationPending&&(action==='review'||action==='apply'&&!pending))return;
  if(disabled||working.current||!ready||storageError||action==='status'&&!pending||action==='review'&&pending||action==='apply'&&!pending&&(!review||!ack))return;
  working.current=true;setBusy(true);setError('');setMessage('');
  try{
   const targets=[mode==='selected'&&existing?{path:existing.path as LegalPath,recordId:existing.id,expectedRevision:existing.currentRevision}:{path,recordId:null,expectedRevision:null}];
   if(mode==='selected'&&!existing&&!pending)throw Error('Select an existing legal page first.');
   if(action==='review'){const response=await api('/api/cms/migrations/legal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,targets})});const checked=await verifyLegalReview(response,site,targets);if(alive.current){setReview(checked);setAck(false);}return;}
   let request=pending;
   if(!request){request={version:1,site,actorId,requestKey:crypto.randomUUID(),sourceDigest:review!.sourceDigest,reviewDigest:review!.reviewDigest,targets:review!.items.map(({path,recordId,expectedRevision})=>({path,recordId,expectedRevision})),sources:review!.items.map(({path,sourceSha256})=>({path,sourceSha256}))};localStorage.setItem(key,JSON.stringify(request));setPending(request);}
   const response=await api('/api/cms/migrations/legal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{action,site,requestKey:request.requestKey}:{action,site,requestKey:request.requestKey,reviewDigest:request.reviewDigest,targets:request.targets})});
   if(!alive.current)return;
   if(action==='status'&&!verifyLegalRecovery(response,request)){setMessage('No completed result is visible yet. Keep this request and check again or retry the same request.');return;}
   if(action==='apply')verifyLegalReceipt(response,request);
   await complete();
  }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Legal migration is unavailable.');}finally{working.current=false;if(alive.current)setBusy(false);}
 }
 return <details className='cms-destination-migration'><summary>Import existing legal content</summary><p>Copy the reviewed website privacy, terms or cookie content into a new or selected draft. Applying replaces the selected draft content; its revision history and published version are retained.</p>
 <fieldset disabled={locked||Boolean(review)}><legend>Migration destination</legend><label>Destination mode<select value={mode} onChange={event=>setMode(event.target.value as 'create'|'selected')}><option value='create'>Create a new legal page</option><option value='selected' disabled={!existing}>Replace selected legal draft</option></select></label>{mode==='create'?<label>Legal source page<select value={path} onChange={event=>setPath(event.target.value as LegalPath)}>{legalPaths.map(path=><option key={path} value={path}>{path}</option>)}</select></label>:<p>{existing?.path??'Select a legal page in the page list.'}</p>}<button type='button' onClick={()=>void execute('review')}>Review legal migration</button></fieldset>
 {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{review&&<><p>{review.notice}</p>{review.items.map(item=><div key={item.path}><h3>{item.path}</h3><details><summary>Current draft content</summary>{item.before?<><CompositionPreview value={item.before.composition} locale='en' now={new Date()} loadPreview={loadPreview}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(item.before.seo??{},null,2)}</pre></>:<p>A new page will be created.</p>}</details><details><summary>Proposed legal content</summary><CompositionPreview value={item.payload.composition} locale='en' now={new Date()} loadPreview={loadPreview}/><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(item.payload.seo??{},null,2)}</pre></details></div>)}<label><input type='checkbox' checked={ack} disabled={locked} onChange={event=>setAck(event.target.checked)}/>I reviewed the legal text, links, SEO and draft replacement.</label><button type='button' disabled={locked||!ack} onClick={()=>void execute('apply')}>Apply reviewed legal draft</button><button type='button' disabled={locked} onClick={()=>{setReview(null);setAck(false);}}>Discard legal review</button></>}
 {pending&&<aside><p>Pending legal migration: <code style={{overflowWrap:'anywhere'}}>{pending.requestKey}</code>. Recovery identifiers are saved for this account and website; content is not stored in the browser.</p><button type='button' disabled={disabled||busy||storageError} onClick={()=>void execute('status')}>Check legal migration result</button><button type='button' disabled={disabled||busy||storageError} onClick={()=>void execute('apply')}>Retry same legal migration</button></aside>}{busy&&<p role='status'>Working…</p>}</details>;
}
