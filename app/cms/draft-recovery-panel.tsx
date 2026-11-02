'use client';
import {useEffect,useRef,useState} from 'react';
import {listDraftCheckpoints,writeDraftCheckpoint,removeDraftCheckpoint,type DraftCheckpoint,type CheckpointScope} from '../../lib/cms/draft-checkpoints';
type Props={scope:CheckpointScope;baseRevision:string;base:unknown;draft:unknown;valid:boolean;dirty:boolean;disabled:boolean;onRestore:(value:DraftCheckpoint)=>Promise<void>};
/** Key this panel by account, record and base revision. Copies are explicit;
 * local persistence never starts just because an editor was opened. */
export function DraftRecoveryPanel({scope,baseRevision,base,draft,valid,dirty,disabled,onRestore}:Props){
 const [enabled,setEnabled]=useState(false),[rows,setRows]=useState<DraftCheckpoint[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [automatic,setAutomatic]=useState(false);
 const lastCopied=useRef('');
 const signature=JSON.stringify({scope,baseRevision,base,draft});
 const own=useRef<{id:string;createdAt:string}|null>(null),alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 function refresh(){const found=listDraftCheckpoints(localStorage,scope);if(alive.current){setRows(found);setLoaded(true);}}
 async function run(work:()=>Promise<void>){if(lock.current||disabled)return;lock.current=true;setBusy(true);setMessage('');try{await work();}catch(e){if(alive.current){setAutomatic(false);setMessage(`Automatic copies paused. ${e instanceof Error?e.message:'Local recovery failed. Keep the editor open.'}`);}}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function copy(){
  const now=new Date().toISOString();own.current??={id:crypto.randomUUID(),createdAt:now};
  // Serialization strips optional undefined fields; editor schemas validate
  // content before copying and again before restoration.
  const value:DraftCheckpoint=JSON.parse(JSON.stringify({version:1,scope,...own.current,baseRevision,base,draft,updatedAt:now}));
  await writeDraftCheckpoint({storage:localStorage,locks:navigator.locks,enabled,value});lastCopied.current=signature;refresh();if(alive.current)setMessage(`Browser copy saved at ${new Date(now).toLocaleTimeString()}. Nothing was sent to the server.`);
 }
 useEffect(()=>{
  if(!automatic||!enabled||!dirty||!valid||disabled||busy||signature===lastCopied.current)return;
  const timer=setTimeout(()=>{if(alive.current)void run(copy);},1000);
  return()=>clearTimeout(timer);
 },[automatic,enabled,dirty,valid,disabled,busy,signature]); // Copy the exact rendered draft after a quiet interval.
 return <details className='cms-history'><summary>Browser recovery copies</summary><p>Copies contain private draft content on this browser profile. They remain after sign-out and server saves until you remove them. Anyone with access to the browser profile may access them. Use this only on a trusted device.</p>
 <label><input type='checkbox' checked={enabled} disabled={busy||disabled} onChange={e=>{setEnabled(e.target.checked);if(!e.target.checked)setAutomatic(false);}}/>Enable local recovery copies for this editing session</label>
 <label><input type='checkbox' checked={automatic} disabled={busy||disabled||!enabled} onChange={e=>setAutomatic(e.target.checked)}/>Automatically update this browser copy after edits</label>{automatic&&dirty&&!valid&&<p>Browser copying is paused until the form is valid. The previous copy remains available.</p>}
 <button disabled={busy||disabled||!enabled||!valid||!dirty} onClick={()=>void run(copy)}>Save browser recovery copy</button><p>Automatic mode waits one second after valid edits. Wait for the saved-copy message before closing. Turning it off stops new copies but does not remove existing ones.</p>
 <button disabled={busy||disabled} onClick={()=>void run(async()=>refresh())}>Find browser recovery copies</button>
 {message&&<p role='status'>{message}</p>}{loaded&&rows.length===0&&<p>No browser copies for this record and account.</p>}
 {rows.map(row=><div key={row.id}><p>Saved {new Date(row.updatedAt).toLocaleString()} · Base revision {row.baseRevision}</p><button disabled={busy||disabled} onClick={()=>{if(window.confirm('Restore or compare this browser copy? Current unsaved edits will be replaced only after access and revision checks.'))void run(async()=>{setAutomatic(false);await onRestore(row);});}}>Restore browser copy</button><button disabled={busy||disabled} onClick={()=>{if(window.confirm('Remove this browser recovery copy? This does not change server content.'))void run(async()=>{setAutomatic(false);await removeDraftCheckpoint(localStorage,navigator.locks,row);if(own.current?.id===row.id){own.current=null;lastCopied.current='';}refresh();});}}>Remove browser copy</button></div>)}
 </details>;
}
