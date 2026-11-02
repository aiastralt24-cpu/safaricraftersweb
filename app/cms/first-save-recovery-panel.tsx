'use client';
import {useEffect,useState} from 'react';
import {creationType,readPendingDraftCreation,retryDraftCreation,cancelDraftCreation,type PendingDraftCreation} from '../../lib/cms/draft-creation-recovery';
type Props={actor:string;site:string;disabled:boolean;send:(request:unknown)=>Promise<unknown>};
export function FirstSaveRecoveryPanel({actor,site,disabled,send}:Props){
 const [pending,setPending]=useState<PendingDraftCreation[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[working,setWorking]=useState(false);
 function refresh(){try{setPending(creationType.options.flatMap(kind=>{const value=readPendingDraftCreation(localStorage,actor,site,kind);return value?[value]:[];}));setError('');}catch(e){setError(e instanceof Error?e.message:'Recovery data could not be read.');}}
 useEffect(()=>{refresh();const update=()=>refresh();window.addEventListener('cms-first-save',update);window.addEventListener('storage',update);window.addEventListener('focus',update);return()=>{window.removeEventListener('cms-first-save',update);window.removeEventListener('storage',update);window.removeEventListener('focus',update);};},[actor,site]); // eslint-disable-line react-hooks/exhaustive-deps
 async function resolve(item:PendingDraftCreation,cancel:boolean){
  setWorking(true);setError('');setMessage('');
  try{
   const options={storage:localStorage,locks:navigator.locks,actor,site,kind:item.request.type,send,retainUntilLoaded:true};
   const outcome=cancel?await cancelDraftCreation(options):await retryDraftCreation(options);
   setMessage('status' in outcome&&outcome.status==='cancelled'?'Pending save cancelled. You can edit and save your draft again.':'Saved record confirmed. Reload the workspace if it is missing from the content list, then select it to continue editing. Your current editor changes have not been replaced.');
   refresh();
  }catch(e){setError(e instanceof Error?e.message:'The save could not be resolved.');}finally{setWorking(false);}
 }
 return <section className="cms-notice" aria-label="First save recovery"><p>New-record saves temporarily keep a private content snapshot in this browser until the saved record loads. It remains after sign-out if a save is unresolved. Use a trusted browser profile.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{pending.map(item=><div key={item.request.requestKey}><strong>{item.request.title}</strong><p>{item.request.type} · {item.confirmed?'Saved; waiting for the record to load':'Save not yet confirmed'}</p><button disabled={disabled||working} onClick={()=>resolve(item,false)}>Retry first save</button><button disabled={disabled||working} onClick={()=>resolve(item,true)}>Resolve or cancel first save</button></div>)}{pending.length>0&&<button disabled={disabled||working} onClick={()=>{if(window.confirm('Reload the workspace? Unsaved editor changes will be lost. Pending save snapshots will be kept.'))window.location.reload();}}>Reload workspace</button>}</section>;
}
