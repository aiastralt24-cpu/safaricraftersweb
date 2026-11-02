'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedRecordOwnership,type RecordOwnership} from '../../lib/cms/record-ownership';
export function RecordOwnershipPanel({site,record,api,disabled}:{site:string;record:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean}){
 const [value,setValue]=useState<RecordOwnership|null>(null),[choice,setChoice]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const ticket=useRef(0);useEffect(()=>()=>{ticket.current++;},[]);
 async function send(action:'read'|'assign'){
  if(disabled||busy||(action==='assign'&&(!value?.canAssign||!choice)))return;
  const generation=++ticket.current;setBusy(true);setError('');setMessage('');
  try{const response=await api('/api/cms/ownership',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record,...(action==='assign'?{owner:choice,expected:value!.version}:{})})});const result=verifiedRecordOwnership(response.result,site,record);
   if(generation!==ticket.current)return;setValue(result);setChoice(result.ownerId);if(action==='assign')setMessage('Content owner updated. Content approval and access permissions are unchanged.');
  }catch(reason){if(generation===ticket.current){setValue(null);setError(reason instanceof Error?reason.message:'Ownership request failed.');}}
  finally{if(generation===ticket.current)setBusy(false);}
 }
 return <section aria-label='Content ownership'><h3>Content ownership</h3><p>The owner is responsible for this record. Assignment does not grant permissions or approve content.</p><button disabled={disabled||busy} onClick={()=>void send('read')}>Load content owner</button>
 {error&&<p role='alert'>{error} Reload the owner to confirm the current state before retrying.</p>}{message&&<p role='status'>{message}</p>}
 {value&&<><p>Current owner: {value.ownerEmail??(value.eligible?'Assigned CMS member':'Assigned member is no longer eligible')}.</p>{value.canAssign&&<fieldset disabled={disabled||busy}><legend>Assign content owner</legend><label>Content owner<select value={choice} onChange={e=>setChoice(e.target.value)}>{!value.owners.some(o=>o.id===value.ownerId)&&<option value={value.ownerId} disabled>Current owner unavailable</option>}{value.owners.map(owner=><option key={owner.id} value={owner.id}>{owner.email??owner.id}</option>)}</select></label><button disabled={disabled||busy||choice===value.ownerId||!value.owners.some(o=>o.id===choice)} onClick={()=>void send('assign')}>Save content owner</button></fieldset>}</>}
 </section>;
}
