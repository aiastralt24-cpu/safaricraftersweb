'use client';
import {useEffect,useRef,useState} from 'react';
import {healthReportHref} from '../../lib/cms/content-health-link';
import {z} from 'zod';
import {parseScheduledReleaseList,type scheduledReleaseRows} from '../../lib/cms/scheduled-release-list';
type Row=z.infer<typeof scheduledReleaseRows>[number];
type Props={onInspectDelivery?:(request:string)=>void;site:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
const labels={pending:'Waiting to run',running:'Processing',published:'Publication confirmed',blocked:'Needs attention',cancelled:'Cancelled'};
export function ScheduledReleaseList({site,disabled,api,onInspectDelivery}:Props){
 const [rows,setRows]=useState<Row[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function load(append=false){
  const result=parseScheduledReleaseList(await api(`/api/cms/releases/schedules?site=${encodeURIComponent(site)}${append&&cursor?`&before=${encodeURIComponent(cursor)}`:''}`),site);
  if(alive.current){setRows(old=>append?[...old,...result.schedules.filter(row=>!old.some(prior=>prior.id===row.id))]:result.schedules);setCursor(result.nextCursor);setLoaded(true);}
 }
 async function run(work:()=>Promise<void>){if(lock.current||disabled)return;lock.current=true;setBusy(true);setMessage('');try{await work();}catch(e){if(alive.current){setRows([]);setCursor(null);setLoaded(false);setMessage(e instanceof Error?e.message:'Schedules could not be refreshed.');}}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function cancel(row:Row){
  const response=await api('/api/cms/releases/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',site,schedule:row.id})});
  z.object({id:z.literal(row.id),status:z.literal('cancelled')}).strict().parse(response.result);
  // Remove stale actionable state even if the subsequent refresh fails.
  if(alive.current)setRows(old=>old.map(item=>item.id===row.id?{...item,status:'cancelled'}:item));
  await load();if(alive.current)setMessage('Schedule cancelled. No published content was withdrawn.');
 }
 return <section aria-label='Scheduled release groups'><h3>Scheduled release groups</h3><p>Times are shown in UTC. Changes to revisions, approval or access can block a group. Publication confirmation does not confirm website cache delivery.</p>
  <button disabled={busy||disabled} onClick={()=>void run(()=>load())}>Refresh group schedules</button>
  {message&&<p role='alert'>{message}</p>}{loaded&&rows.length===0&&<p>No group schedules are available to this account.</p>}
  <ul>{rows.map(row=><li key={row.id}><p><time dateTime={row.runAt}>{new Date(row.runAt).toISOString()}</time> · {row.items.length} records · <strong>{labels[row.status]}</strong></p>
   {row.errorCode&&<p>{row.errorCode==='validation_failed'?'Content validation failed. Correct and approve the affected records before creating a new schedule.':row.errorCode==='publication_guard_failed'?'A revision, approval, permission or publication requirement changed. Review every member before rescheduling.':'The worker could not finish. Refresh for retry status; groups marked Needs attention require operator review.'}</p>}
   {row.status==='published'&&(onInspectDelivery?<button disabled={busy||disabled} onClick={()=>onInspectDelivery(row.request)}>Inspect group delivery</button>:<p>Use request {row.request} in Website delivery status to check delivery.</p>)}
   <details><summary>Scheduled records and revisions</summary><ol>{row.items.map(item=><li key={item.record}><a href={healthReportHref(site,item.record)}>Open record {item.record}</a> · revision {item.revision}</li>)}</ol></details>
   {['pending','running'].includes(row.status)&&<button disabled={busy||disabled} onClick={()=>{if(window.confirm('Cancel this scheduled group? Cancellation requires publishing permission for every member.'))void run(()=>cancel(row));}}>Cancel group schedule</button>}
  </li>)}</ul>{cursor&&<button disabled={busy||disabled} onClick={()=>void run(()=>load(true))}>Load older group schedules</button>}
 </section>;
}
