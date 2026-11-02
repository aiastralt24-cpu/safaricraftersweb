'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedScheduleMonitor,type ScheduleMonitor} from '../../lib/cms/schedule-monitor';
import {healthReportHref} from '../../lib/cms/content-health-link';
export function ScheduleMonitorPanel({site,api}:{site:string;api:(path:string)=>Promise<any>}){
 const [state,setState]=useState<ScheduleMonitor['state']>('attention'),[operation,setOperation]=useState<ScheduleMonitor['operation']>('all'),[result,setResult]=useState<ScheduleMonitor|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;useEffect(()=>()=>{generation.current++;},[site]);
 function reset(){generation.current++;setResult(null);setError('');setBusy(false);}
 async function load(after?:string){const ticket=++generation.current;setBusy(true);setError('');if(!after)setResult(null);
 try{const query={site,state,operation,...(after?{after}:{})},data=await apiRef.current('/api/cms/schedules/monitor?'+new URLSearchParams(query));if(ticket!==generation.current)return;
 const value=verifiedScheduleMonitor(data.result,query);if(after&&result){const last=result.items.at(-1),first=value.items[0];if(value.items.some(item=>result.items.some(previous=>previous.id===item.id))||(last&&first&&(Date.parse(first.runAt)<Date.parse(last.runAt)||(Date.parse(first.runAt)===Date.parse(last.runAt)&&first.id<=last.id))))throw Error('Schedule continuation mismatch.');}
 setResult(old=>({...value,items:after&&old?[...old.items,...value.items]:value.items}));
 }catch(reason){if(ticket===generation.current){setResult(null);setError(reason instanceof Error?reason.message:'Schedule monitoring is unavailable.');}}finally{if(ticket===generation.current)setBusy(false);}}
 return <section aria-label='Individual publication schedules'><h3>Individual publication schedules</h3><p>Search accessible schedules across this website, ordered by execution time in UTC. Withdrawal schedules remove published content; they do not track document or certification expiry. Open a record to inspect or cancel its schedule. Delivery acknowledgement is separate.</p>
 <label>Schedule status<select value={state} onChange={event=>{reset();setState(event.target.value as typeof state);}}>{['attention','pending','running','blocked','published','unpublished','cancelled','all'].map(value=><option key={value} value={value}>{value==='attention'?'Pending, running or blocked':value}</option>)}</select></label>
 <label>Scheduled operation<select value={operation} onChange={event=>{reset();setOperation(event.target.value as typeof operation);}}><option value='all'>All operations</option><option value='publish'>Publish</option><option value='unpublish'>Withdraw</option></select></label>
 <button disabled={busy} onClick={()=>void load()}>{busy?'Loading schedules…':'Refresh individual schedules'}</button>{error&&<p role='alert'>{error}</p>}
 {result&&!result.items.length&&<p>No accessible schedules match these filters.</p>}
 <ul>{result?.items.map(item=><li key={item.id}><a href={healthReportHref(site,item.record)}>{item.title} · {item.locale}</a><p>{item.operation==='publish'?'Publish':'Withdraw'} · <time dateTime={item.runAt}>{new Date(item.runAt).toISOString()}</time> · {item.status} · {item.attempts} attempts</p>{item.status==='blocked'&&<p>Open the record to review its revision, approval and permissions before rescheduling.</p>}{item.errorCode&&<p>Worker status: {item.errorCode}</p>}</li>)}</ul>
 {result?.nextCursor&&<button disabled={busy} onClick={()=>void load(result.nextCursor!)}>Load later schedules</button>}
 </section>;
}
