'use client';
import {useEffect,useRef,useState} from 'react';
import {parseFuturePublicationSchedule} from '../../lib/cms/publication-schedule';
type Entry={id:string;site:string;record:string;revision:string;operation:'publish'|'unpublish';runAt:string;status:string;errorCode:string|null};
type Props={site:string;record:string;revision:string;publishedRevision:string|null;approved:boolean;canPublish:boolean;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
/** Key by account/site/record/revision. Database remains authoritative for permissions. */
export function PublicationSchedulePanel({site,record,revision,publishedRevision,approved,canPublish,disabled,api}:Props){
 const [entries,setEntries]=useState<Entry[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [operation,setOperation]=useState<'publish'|'unpublish'>('publish'),[date,setDate]=useState(''),[offset,setOffset]=useState('+00:00');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const target=operation==='publish'?revision:publishedRevision;
 let instant='';try{if(target)instant=parseFuturePublicationSchedule({site,record,revision:target,operation,runAt:`${date}:00${offset}`},new Date()).runAt;}catch{/* Incomplete/invalid inputs remain unschedulable. */}
 async function refresh(){const result=await api(`/api/cms/schedules?site=${encodeURIComponent(site)}&record=${encodeURIComponent(record)}`);if(alive.current){setEntries(result.schedules);setLoaded(true);}}
 async function run(work:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await work();}catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Schedule request failed. Reload schedules before retrying.');}finally{if(alive.current)setBusy(false);}}
 const locked=disabled||busy;
 return <details className='cms-history'><summary>Schedule publication or withdrawal</summary>
  <p>Schedules use a saved revision. Edits, approval changes or revoked access can block execution. Publishing and website cache delivery are separate steps.</p>
  <button type='button' disabled={locked} onClick={()=>run(refresh)}>Refresh schedules</button>
  {message&&<p role='status'>{message}</p>}
  {loaded&&entries.length===0&&<p>No schedules for this record.</p>}
  {entries.map(entry=><div key={entry.id}><p>{entry.operation==='publish'?'Publish':'Withdraw'} · <time dateTime={entry.runAt}>{new Date(entry.runAt).toISOString()}</time> · {entry.status.replaceAll('_',' ')}</p>
   {entry.errorCode&&<p>{entry.errorCode==='publication_guard_failed'?'The revision, approval, permissions or publication requirements changed. Reload the record and check it before creating a new schedule.':entry.errorCode==='validation_failed'?'Publication validation failed. Correct the content and submit it for review again.':'The worker could not finish validation or execution. Refresh to check whether it will retry or needs attention.'}</p>}
   {canPublish&&['pending','running'].includes(entry.status)&&<button type='button' disabled={locked} onClick={()=>{if(window.confirm('Cancel this schedule?'))void run(async()=>{await api('/api/cms/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',site,schedule:entry.id})});await refresh();if(alive.current)setMessage('Schedule cancelled.');});}}>Cancel schedule</button>}
  </div>)}
  {canPublish&&<fieldset disabled={locked}><legend>Create a schedule</legend>
   <label>Scheduled action<select value={operation} onChange={e=>setOperation(e.target.value as 'publish'|'unpublish')}><option value='publish'>Publish approved revision</option><option value='unpublish'>Withdraw currently published revision</option></select></label>
   <label>Scheduled date and time<input type='datetime-local' step='60' value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>UTC offset at that date<input value={offset} placeholder='+05:30' onChange={e=>setOffset(e.target.value)} pattern='[+-][0-9]{2}:[0-9]{2}'/></label>
   <p>Use an explicit offset, such as +05:30 for India or +00:00 for UTC. For daylight-saving regions, use the offset that applies on the chosen date.</p>
   {instant&&<p>Execution instant: <time dateTime={instant}>{instant}</time></p>}
   {operation==='publish'&&!approved&&<p>Approve the saved revision before scheduling publication.</p>}
   {operation==='unpublish'&&!publishedRevision&&<p>Publish this record before scheduling its withdrawal.</p>}
   <button type='button' disabled={!instant||!target||(operation==='publish'&&!approved)} onClick={()=>{if(!instant||!target)return;if(window.confirm(`${operation==='publish'?'Publish':'Withdraw'} this saved revision at ${instant}?`))void run(async()=>{await api('/api/cms/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'schedule',site,record,revision:target,operation,runAt:instant})});await refresh();if(alive.current)setMessage('Schedule saved. Refresh to check execution status.');});}}>Confirm schedule</button>
  </fieldset>}
 </details>;
}
