'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedDateMonitor,type DocumentDateMonitor} from '../../lib/cms/document-date-monitor';
import {healthReportHref} from '../../lib/cms/content-health-link';
export function DocumentDateMonitorPanel({site,api}:{site:string;api:(path:string)=>Promise<any>}){
 const [scope,setScope]=useState<DocumentDateMonitor['scope']>('published'),[filter,setFilter]=useState<DocumentDateMonitor['filter']>('attention'),[result,setResult]=useState<DocumentDateMonitor|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;useEffect(()=>()=>{generation.current++;},[site]);
 function reset(){generation.current++;setResult(null);setError('');setBusy(false);}
 async function load(after?:string){const ticket=++generation.current;setBusy(true);setError('');if(!after)setResult(null);
 try{const query={site,scope,filter,...(after?{after}:{})},data=await apiRef.current('/api/cms/documents/dates?'+new URLSearchParams(query));if(ticket!==generation.current)return;
 const value=verifiedDateMonitor(data.result,query);if(after&&result&&value.asOf!==result.asOf)throw Error('The UTC date changed. Refresh this report before loading more.');setResult(old=>({...value,items:after&&old?[...old.items,...value.items]:value.items}));
 }catch(reason){if(ticket===generation.current){setResult(null);setError(reason instanceof Error?reason.message:'Document date monitoring is unavailable.');}}finally{if(ticket===generation.current)setBusy(false);}}
 return <section aria-label='Document expiry and review'><h3>Document expiry and review</h3><p>Includes certificates stored as documents. Published and latest saved draft revisions are checked separately. Expiry dates are inclusive in UTC; “expiring soon” covers today through 30 days ahead. A saved renewal does not update the published revision.</p>
 <label>Document revision scope<select value={scope} onChange={event=>{reset();setScope(event.target.value as typeof scope);}}><option value='published'>Published revision</option><option value='draft'>Latest saved draft</option></select></label>
 <label>Document date status<select value={filter} onChange={event=>{reset();setFilter(event.target.value as typeof filter);}}><option value='attention'>Needs attention</option><option value='expired'>Expired</option><option value='expiring'>Expiring within 30 days</option><option value='review'>Review overdue</option><option value='invalid'>Invalid saved dates</option><option value='all'>All documents</option></select></label>
 <button disabled={busy} onClick={()=>void load()}>{busy?'Loading document dates…':'Refresh document dates'}</button>{error&&<p role='alert'>{error}</p>}
 {result&&<p role='status'>Checked as of {result.asOf} UTC · {result.items.length} matching documents loaded{result.nextCursor?' · More available':''}.</p>}{result&&!result.items.length&&<p>No accessible documents match these filters.</p>}
 <ul>{result?.items.map(item=><li key={item.record}><a href={healthReportHref(site,item.record)}>{item.title} · {item.locale}</a><p>Reported revision: {item.revision}. Opening the editor loads the latest saved draft.</p><p>Expiry: {item.expiresOn??'Not set or invalid'} · Review: {item.reviewOn??'Not set or invalid'}</p><p>{item.expired?'Expired. ':item.expiring?'Expiring soon. ':''}{item.reviewOverdue?'Review overdue. ':''}{item.invalidDates?'Correct invalid saved dates.':''}</p><p>{item.expiryPolicy==='warn'?'Expiry policy: warn only; availability is not removed.':item.expiryPolicy==='blockPublication'?'Expiry policy: block new publication; existing availability is not removed.':item.expiryPolicy==='removeAvailability'?'Expiry policy: remove download availability after expiry.':'Expiry policy is missing or invalid.'}</p></li>)}</ul>
 {result?.nextCursor&&<button disabled={busy} onClick={()=>void load(result.nextCursor!)}>Load more document dates</button>}
 </section>;
}
