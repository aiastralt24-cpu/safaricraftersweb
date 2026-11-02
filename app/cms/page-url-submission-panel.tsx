'use client';
import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import {pageUrlImpactSchema} from '../../lib/cms/page-url-impact';
import {urlSubmissionStorageKey,parseUrlSubmission,verifySubmittedProposal,parseUrlSubmissionStatus,type PageUrlSubmission} from '../../lib/cms/page-url-proposal';
type Props={actor:string;site:string;record:string;revision:string;impact:z.infer<typeof pageUrlImpactSchema>|null;disabled:boolean;canSubmit:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onPending:(value:boolean)=>void};
export function PageUrlSubmissionPanel({actor,site,record,revision,impact,disabled,canSubmit,api,onPending}:Props){
 const [pending,setPending]=useState<PageUrlSubmission|null>(null),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[choice,setChoice]=useState<'permanent'|'none'>('permanent'),[reason,setReason]=useState(''),[review,setReview]=useState(false),[stopReview,setStopReview]=useState(false),[ack,setAck]=useState(false);
 const alive=useRef(true),lock=useRef(false),scope={actor,site,record},key=urlSubmissionStorageKey(scope);
 useEffect(()=>{alive.current=true;try{const raw=sessionStorage.getItem(key);if(raw)setPending(parseUrlSubmission(raw,scope));}catch{setStorageError('Saved submission recovery is unavailable. Reload this tab before submitting another proposal.');}setReady(true);return()=>{alive.current=false;};},[key]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{onPending(Boolean(pending)||!ready||Boolean(storageError));},[pending,ready,storageError,onPending]);
 useEffect(()=>{setReview(false);setAck(false);},[impact?.snapshot,impact?.proposedPath]);
 function persist(value:PageUrlSubmission){sessionStorage.setItem(key,JSON.stringify(value));setPending(value);}
 function clear(){sessionStorage.removeItem(key);setPending(null);setReview(false);setAck(false);setStopReview(false);}
 async function send(body:unknown){return api('/api/cms/page-url-proposals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
 async function run(action:'new'|'retry'|'status'|'stop'){
  if(lock.current||disabled||!ready||storageError||action==='new'&&(!canSubmit||!impact||pending||!ack||!review))return;
  lock.current=true;setBusy(true);setError('');setMessage('');
  try{
   let item=pending;
   if(action==='new'){if(!impact||impact.status!=='eligible'||impact.nextCursor)throw Error('Finish the impact review before submitting.');item={actor,site,record,revision,path:impact.proposedPath,snapshot:impact.snapshot,redirect:choice,reason:choice==='none'?reason:null,requestKey:crypto.randomUUID()};persist(item);}
   if(!item)throw Error('No pending submission.');
   if(action==='stop'){item={...item,stopRequested:true};persist(item);setStopReview(false);}
   if(action==='new'||action==='retry'){
    if(item.stopRequested)throw Error('This request is being stopped. Check its status or retry stopping it.');const {actor:owner,stopRequested,...command}=item;void owner;void stopRequested;
    const raw=await send({action:'propose',...command});const proposal=verifySubmittedProposal(raw.result,item);if(!alive.current)return;clear();setMessage(`URL proposal saved (${proposal.status}${proposal.stale?', stale':''}). Find it under Saved URL change proposals. The page URL has not changed.`);
   }else{
    const raw=await send({action:action==='stop'?'stop_submission':'submission_status',site,record,requestKey:item.requestKey});const status=parseUrlSubmissionStatus(raw.result,item);if(!alive.current)return;
    if(status.status==='completed'){verifySubmittedProposal(status.proposal,item);clear();setMessage('The proposal was saved. Find it under Saved URL change proposals; stopping submission did not cancel that saved proposal.');}
    else if(status.status==='cancelled'){clear();setMessage('Submission stopped. Delayed retries cannot create this proposal.');}
    else setMessage('The submission is still unconfirmed. Keep this tab open and check again, retry the same request, or stop it.');
   }
  }catch(e){if(alive.current)setError(`${e instanceof Error?e.message:'Submission could not be confirmed.'} Keep any pending request for recovery.`);}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 const validReason=choice==='permanent'||!impact?.published||reason.trim().length>=10;
 return <section aria-label='Submit URL proposal'>
  {storageError&&<p role='alert'>{storageError}</p>}{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{busy&&<p role='status'>Checking URL submission…</p>}
  {pending?<><p>A URL proposal submission is pending for {pending.path}. Its decision and reason are kept in this browser tab for reload recovery. Closing the tab ends that local recovery copy.</p><button type='button' disabled={disabled||busy} onClick={()=>void run('status')}>Check URL submission</button>{!pending.stopRequested&&<button type='button' disabled={disabled||busy||!canSubmit} onClick={()=>void run('retry')}>Retry same URL submission</button>}{stopReview?<><p>If it already saved, its existing proposal will be returned. Otherwise stopping prevents delayed creation.</p><button type='button' disabled={disabled||busy} onClick={()=>void run('stop')}>Confirm stop submission</button><button type='button' disabled={busy} onClick={()=>setStopReview(false)}>Keep pending submission</button></>:<button type='button' disabled={disabled||busy} onClick={()=>setStopReview(true)}>{pending.stopRequested?'Retry stopping submission':'Stop pending submission'}</button>}</>:
   canSubmit&&impact?.status==='eligible'&&!impact.nextCursor&&<fieldset disabled={disabled||busy||!ready||Boolean(storageError)}><legend>Redirect decision</legend><label>Old URL behavior<select aria-label="Old URL behavior" value={choice} onChange={e=>{setChoice(e.target.value as 'permanent'|'none');setReview(false);setAck(false);}} disabled={review}><option value='permanent'>Permanent redirect to the new URL</option><option value='none'>No redirect</option></select></label>{choice==='none'&&<label>Reason for no redirect<textarea aria-label="Reason for no redirect" value={reason} maxLength={2000} disabled={review} onChange={e=>{setReason(e.target.value);setAck(false);}}/>{impact.published&&<small>Explain this decision in at least 10 characters.</small>}</label>}
    {!review?<button type='button' disabled={!validReason} onClick={()=>setReview(true)}>Review URL proposal</button>:<><p>{impact.currentPath} → {impact.proposedPath}. {choice==='permanent'?'Keep a permanent redirect.':'Do not create a redirect.'} Submission records a proposal for editorial approval and does not change the URL.</p><p>The decision and reason are stored in this tab until submission is confirmed.</p><label><input type='checkbox' checked={ack} onChange={e=>setAck(e.target.checked)}/>I reviewed the impact findings, coverage limits and redirect decision.</label><button type='button' disabled={!ack||!validReason} onClick={()=>void run('new')}>Submit reviewed URL proposal</button><button type='button' onClick={()=>{setReview(false);setAck(false);}}>Back to redirect choice</button></>}
   </fieldset>}
 </section>;
}
