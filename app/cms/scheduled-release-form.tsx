'use client';
import {useEffect,useRef,useState} from 'react';
import {readPendingScheduledRelease,submitRecoverableScheduledRelease,scheduledReleaseRequest,type PendingScheduledRelease,type ScheduledReleaseRequest} from '../../lib/cms/scheduled-release-recovery';
type Props={site:string;actor:string;items:{record:string;revision:string}[];ready:boolean;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onBusy:(busy:boolean)=>void;onComplete:(request:string)=>void};
export function ScheduledReleaseForm({site,actor,items,ready,disabled,api,onBusy,onComplete}:Props){
 const [pending,setPending]=useState<PendingScheduledRelease|null>(null),[hydrated,setHydrated]=useState(false),[broken,setBroken]=useState(false),[date,setDate]=useState(''),[offset,setOffset]=useState('+00:00'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;try{setPending(readPendingScheduledRelease(localStorage,actor,site));}catch(e){setBroken(true);setMessage(String(e));}setHydrated(true);return()=>{alive.current=false;};},[actor,site]);
 let instant='';try{const parsed=scheduledReleaseRequest.parse({site,request:site,items,runAt:`${date}:00${offset}`});if(Date.parse(parsed.runAt)>Date.now())instant=parsed.runAt;}catch{/* incomplete inputs */}
 async function submit(request:ScheduledReleaseRequest){
  if(lock.current)return;lock.current=true;setBusy(true);onBusy(true);setMessage('');
  try{
   const result=await submitRecoverableScheduledRelease({storage:localStorage,locks:navigator.locks,actor,request,now:()=>new Date(),send:value=>api('/api/cms/releases/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,action:'schedule'})})});
   if(alive.current){setMessage(`Schedule ${result.id} confirmed for ${result.runAt}. Refresh group schedules to check its current status.`);setDate('');onComplete(result.request);}
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Schedule confirmation unavailable. Recover the same request.');}
  finally{lock.current=false;if(alive.current){try{setPending(readPendingScheduledRelease(localStorage,actor,site));}catch{setBroken(true);}setBusy(false);onBusy(false);}}
 }
 const locked=disabled||busy||broken||!hydrated;
 return <section aria-label='Schedule a release'><h3>Schedule a release</h3>{message&&<p role='status'>{message}</p>}
 {pending?<><h4>Unconfirmed schedule</h4><p>The earlier request may have been saved. Recover its original time and revisions before creating another schedule.</p><p>{pending.request.runAt} · {pending.request.items.length} records</p><details><summary>Pending scheduled revisions</summary><ol>{pending.request.items.map(item=><li key={item.record}>{item.record} · {item.revision}</li>)}</ol></details><button disabled={locked} onClick={()=>void submit(pending.request)}>Recover schedule result</button></>:<fieldset disabled={locked||!ready}><legend>Schedule the reviewed release order</legend>
 <p>First select records, check readiness and acknowledge their order. Execution rechecks approval, access and the saved revisions.</p>
 <label>Group execution date and time<input type='datetime-local' step='60' value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label>Group UTC offset<input value={offset} placeholder='+05:30' onChange={e=>setOffset(e.target.value)}/></label><p>Use the offset that applies on the selected date, including daylight saving where applicable.</p>
 {instant&&<p>Execution instant: {instant}</p>}
 <button disabled={!instant||!ready||locked} onClick={()=>{if(instant&&window.confirm(`Schedule these ${items.length} reviewed revisions for ${instant}?`))void submit({site,request:crypto.randomUUID(),items,runAt:instant});}}>Confirm group schedule</button>
 </fieldset>}</section>;
}
