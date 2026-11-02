'use client';
import {useEffect,useRef,useState} from 'react';
import {healthReportHref} from '../../lib/cms/content-health-link';
import {z} from 'zod';
import {releaseHistorySchema} from '../../lib/cms/release-history';
import {summarizeReleaseDelivery} from '../../lib/cms/release-delivery-status';
const labels={in_progress:'Delivery in progress',needs_attention:'Delivery needs attention',superseded:'Release superseded',delivered:'Delivery acknowledged',cancelled:'Release cancelled'};
const itemLabels={pending:'Queued',running:'Processing',retry_pending:'Waiting to retry',failed:'Failed',delivered:'Acknowledged',superseded:'Superseded'};
type Props={site:string;actor:string;initialRequest:string|null;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
export function ReleaseDeliveryPanel({site,actor,initialRequest,disabled,api}:Props){
 const [request,setRequest]=useState(initialRequest??''),[result,setResult]=useState<ReturnType<typeof summarizeReleaseDelivery>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checkedAt,setCheckedAt]=useState('');
 const [history,setHistory]=useState<z.infer<typeof releaseHistorySchema>>([]),[historyLoaded,setHistoryLoaded]=useState(false),[cursor,setCursor]=useState<string|null>(null);
 const alive=useRef(true),sequence=useRef(0),storageKey=`cms-release-last-v1:${actor}:${site}`;
 useEffect(()=>{alive.current=true;try{const saved=initialRequest??localStorage.getItem(storageKey);if(saved&&z.string().uuid().safeParse(saved).success)setRequest(saved);}catch{/* A lookup bookmark is optional, unlike pending recovery data. */}return()=>{alive.current=false;sequence.current++;};},[initialRequest,storageKey]);
 async function refresh(){const token=++sequence.current,selected=request;setBusy(true);setResult(null);setError('');try{
  const response=await api(`/api/cms/releases?site=${encodeURIComponent(site)}&request=${encodeURIComponent(selected)}`),checked=summarizeReleaseDelivery(response.result);
  if(checked.result.site.toLowerCase()!==site.toLowerCase()||checked.result.request.toLowerCase()!==selected.toLowerCase())throw Error('The delivery response does not match this release.');
  if(!alive.current||sequence.current!==token)return;
  setResult(checked);setCheckedAt(new Date().toLocaleString());try{localStorage.setItem(storageKey,selected);}catch{/* Status is still visible for this session. */}
 }catch(e){if(alive.current&&sequence.current===token)setError(e instanceof Error?e.message:'Delivery status is unavailable.');}finally{if(alive.current&&sequence.current===token)setBusy(false);}}
 async function loadHistory(append=false){const token=++sequence.current;setBusy(true);setError('');try{
  const response=await api(`/api/cms/releases/history?site=${encodeURIComponent(site)}${append&&cursor?`&before=${encodeURIComponent(cursor)}`:''}`);
  const rows=releaseHistorySchema.parse(response.releases);
  if(response.site!==site||response.nextCursor!==(rows.length===20?rows.at(-1)!.release:null))throw Error('Release history identity mismatch.');
  if(!alive.current||sequence.current!==token)return;
  setHistory(old=>append?[...old,...rows.filter(row=>!old.some(prior=>prior.release===row.release))]:rows);setCursor(response.nextCursor);setHistoryLoaded(true);
 }catch(e){if(alive.current&&sequence.current===token){setHistory([]);setCursor(null);setHistoryLoaded(false);setError(e instanceof Error?e.message:'History is unavailable.');}}finally{if(alive.current&&sequence.current===token)setBusy(false);}}
 async function retry(){if(!window.confirm('Retry exhausted delivery jobs for still-published revisions? This does not republish content.'))return;const token=++sequence.current;setBusy(true);setResult(null);setError('');try{
  const response=await api('/api/cms/releases/retry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,request})});
  const receipt=z.object({site:z.literal(site),request:z.literal(request),retried:z.number().int().min(0).max(50)}).strict().parse(response.result);
  if(alive.current&&sequence.current===token)setError(receipt.retried?`${receipt.retried} delivery jobs queued for retry. Check status again after the worker runs.`:'No eligible exhausted jobs remain. Check the latest status.');
 }catch(e){if(alive.current&&sequence.current===token)setError(e instanceof Error?e.message:'Retry could not be confirmed. Refresh status.');}finally{if(alive.current&&sequence.current===token)setBusy(false);}}
 const counts=new Map<string,number>();for(const item of result?.result.items??[])counts.set(item.status,(counts.get(item.status)??0)+1);
 return <section aria-label='Release delivery status'><h3>Website delivery status</h3><button disabled={busy||disabled} onClick={()=>void loadHistory()}>Load release history</button>{historyLoaded&&history.length===0&&<p>No releases are available to this account.</p>}<ul>{history.map(row=><li key={row.release}><button disabled={busy||disabled} onClick={()=>{setRequest(row.request);setResult(null);setError('');}}>{new Date(row.createdAt).toLocaleString()} · {row.recordCount} records · {row.status==='cancelled'?'Cancelled':'Published'}</button></li>)}</ul>{cursor&&<button disabled={busy||disabled} onClick={()=>void loadHistory(true)}>Load older releases</button>}<p>Check the delivery worker’s latest acknowledgement. This does not independently verify every visitor cache.</p><label>Release request ID<input value={request} disabled={busy||disabled} onChange={e=>{setRequest(e.target.value);setResult(null);setError('');}}/></label><button disabled={busy||disabled||!z.string().uuid().safeParse(request).success} onClick={()=>void refresh()}>{busy?'Checking delivery…':'Check delivery status'}</button>
 {error&&<p role='alert'>{error}</p>}{result&&<><h4 role='status'>{labels[result.summary]}</h4><p>Checked {checkedAt}</p><ul>{[...counts].map(([status,count])=><li key={status}>{itemLabels[status as keyof typeof itemLabels]}: {count}</li>)}</ul>{result.summary==='needs_attention'&&<div><p>The delivery worker has exhausted retries for at least one item. Retrying requires publishing permission for every record in the release.</p><button disabled={busy||disabled} onClick={()=>void retry()}>Retry failed delivery</button></div>}{result.summary==='superseded'&&<p>At least one revision was replaced or withdrawn. This historical release is no longer fully current.</p>}<details><summary>Record delivery details</summary>{result.result.items.map(item=><p key={item.record}><a href={healthReportHref(site,item.record)}>Open record {item.record}</a>: {itemLabels[item.status]} · {item.attempts} attempts</p>)}</details></>}
 </section>;
}
