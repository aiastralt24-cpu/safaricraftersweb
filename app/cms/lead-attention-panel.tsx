'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedLeadAttention,type LeadAttention} from '../../lib/cms/lead-attention';
export function LeadAttentionPanel({site,api,onOpen}:{site:string;api:(path:string,options?:RequestInit)=>Promise<any>;onOpen:(id:string)=>void}){
 const [filter,setFilter]=useState<LeadAttention['filter']>('attention'),[result,setResult]=useState<LeadAttention|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;useEffect(()=>()=>{generation.current++;},[site]);
 async function load(after:string|null=null){const ticket=++generation.current;setBusy(true);setError('');if(!after)setResult(null);
 try{const data=await apiRef.current('/api/cms/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'attention',site,filter,after})});if(ticket!==generation.current)return;
 const value=verifiedLeadAttention(data.result,site,filter,after);setResult(old=>({...value,items:after&&old?[...old.items,...value.items]:value.items}));
 }catch(reason){if(ticket===generation.current){setResult(null);setError(reason instanceof Error?reason.message:'Enquiry attention is unavailable.');}}finally{if(ticket===generation.current)setBusy(false);}}
 return <section aria-label='Enquiries needing attention'><h3>Enquiries needing attention</h3><p>Unassigned enquiries and overdue follow-ups across records you can view. Won, lost and invalid enquiries are excluded. Opening an enquiry loads its latest saved details. This is operational inbox data, not form conversion analytics.</p>
 <label>Enquiry attention filter<select value={filter} onChange={event=>{generation.current++;setResult(null);setError('');setBusy(false);setFilter(event.target.value as typeof filter);}}><option value='attention'>Unassigned or overdue</option><option value='unassigned'>Unassigned</option><option value='overdue'>Overdue follow-up</option></select></label>
 <button disabled={busy} onClick={()=>void load()}>{busy?'Loading enquiries…':'Refresh enquiry attention'}</button>{error&&<p role='alert'>{error}</p>}
 {result&&<p role='status'>{result.items.length} matching enquiries loaded · Last page checked {new Date(result.asOf).toLocaleString()}{result.nextCursor?' · More available':''}.</p>}{result&&!result.items.length&&<p>No accessible open enquiries match these filters.</p>}
 <ul>{result?.items.map(item=><li key={item.id}><button disabled={busy} onClick={()=>onOpen(item.id)}>Open enquiry {item.id}</button><p>{item.status} · {item.priority} priority · Received {new Date(item.createdAt).toLocaleString()}</p><p>{item.unassigned?'Unassigned. ':''}{item.overdue?'Follow-up overdue. ':''}{item.nextFollowUp?`Follow-up: ${new Date(item.nextFollowUp).toLocaleString()}`:''}</p></li>)}</ul>
 {result?.nextCursor&&<button disabled={busy} onClick={()=>void load(result.nextCursor)}>Load more enquiry attention</button>}
 </section>;
}
