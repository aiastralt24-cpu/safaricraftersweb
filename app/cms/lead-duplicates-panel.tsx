'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedLeadDuplicates,type LeadDuplicates} from '../../lib/cms/lead-duplicates';
export function LeadDuplicatesPanel({site,lead,api,onOpen,onMerge,disabled}:{site:string;lead:string;api:(path:string,options?:RequestInit)=>Promise<any>;onOpen:(id:string)=>void;onMerge?:(id:string)=>void;disabled:boolean}){
 const [result,setResult]=useState<LeadDuplicates|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0);useEffect(()=>()=>{generation.current++;},[]);
 async function load(after:string|null=null){const ticket=++generation.current;setBusy(true);setError('');if(!after)setResult(null);
 try{const data=await api('/api/cms/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'duplicates',site,lead,after})});const value=verifiedLeadDuplicates(data.result,site,lead,after);if(ticket===generation.current)setResult(old=>({...value,items:after&&old?[...old.items,...value.items]:value.items}));}
 catch(reason){if(ticket===generation.current){setResult(null);setError(reason instanceof Error?reason.message:'Possible duplicates are unavailable.');}}
 finally{if(ticket===generation.current)setBusy(false);}}
 return <section aria-label='Possible duplicate enquiries'><h3>Possible duplicate enquiries</h3><p>Find enquiries you can view that share an email address from their submitted forms. Repeat enquiries may be intentional. Records and consent remain separate; this check does not merge them.</p>
 <button disabled={disabled||busy} onClick={()=>void load()}>{busy?'Checking enquiries…':'Check possible duplicates'}</button>{error&&<p role='alert'>{error}</p>}
 {result&&<p role='status'>{!result.hasEmail?'This submission has no usable email field to compare.':result.items.length?`${result.items.length} possible duplicates loaded${result.nextCursor?' · More available':''}.`:'No accessible enquiries with a matching email were found.'}</p>}
 <ul>{result?.items.map(item=><li key={item.id}><button disabled={disabled||busy} onClick={()=>onOpen(item.id)}>Review enquiry received {new Date(item.createdAt).toLocaleString()}</button>{onMerge&&<button disabled={disabled||busy} onClick={()=>onMerge(item.id)}>Compare for merge</button>}<p>{item.status.replaceAll('_',' ')} · Matching email · Version {item.version}</p></li>)}</ul>
 {result?.nextCursor&&<button disabled={disabled||busy} onClick={()=>void load(result.nextCursor)}>Load more possible duplicates</button>}
 </section>;
}
