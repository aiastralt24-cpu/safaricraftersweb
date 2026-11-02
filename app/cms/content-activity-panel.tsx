'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedContentActivity,filterContentActivity,type ContentActivity} from '../../lib/cms/content-activity';
import {healthReportHref} from '../../lib/cms/content-health-link';
export function ContentActivityPanel({site,api}:{site:string;api:(path:string)=>Promise<any>}){
 const [result,setResult]=useState<ContentActivity|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [actor,setActor]=useState(''),[action,setAction]=useState('');
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>()=>{generation.current++;},[site]);
 async function load(before:string|null=null){const ticket=++generation.current;setBusy(true);setError('');if(!before)setResult(null);
  try{const data=await apiRef.current(`/api/cms/activity?site=${site}${before?'&before='+before:''}`);if(ticket!==generation.current)return;
   const value=verifiedContentActivity(data.result,site,before);setResult(old=>({...value,items:value.available&&before&&old?[...old.items.map(row=>value.actorLabelsAvailable?row:{...row,actorLabel:null}),...value.items]:value.items}));
  }catch(reason){if(ticket===generation.current){setResult(null);setError(reason instanceof Error?reason.message:'Activity is unavailable.');}}
  finally{if(ticket===generation.current)setBusy(false);}
 }
 const visible=filterContentActivity(result?.items??[],actor,action);
 return <section aria-label='Recent content activity'><h3>Recent content activity</h3><p>Administrator audit history for records you can view. Record titles reflect their current name; events identify the actor and affected revision. Current account emails appear only with access-management permission; otherwise stable user IDs are shown. This is CMS activity, not visitor analytics.</p>
 <button disabled={busy} onClick={()=>void load()}>{busy?'Loading activity…':'Refresh content activity'}</button>
 {error&&<p role='alert'>{error}</p>}{result&&!result.available&&<p>Activity history requires website configuration permission.</p>}
 {result?.available&&!result.items.length&&<p>No accessible content activity was found.</p>}
 {result?.available&&<fieldset disabled={busy}><legend>Filter loaded activity</legend><p>Filters apply to loaded events only. Load older activity to include more history.</p>
 <label>Activity actor<select value={actor} onChange={event=>setActor(event.target.value)}><option value=''>All actors</option>{[...new Map(result.items.map(row=>[row.actorId??'system',row.actorLabel??row.actorId??'System / no user recorded'])).entries()].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Activity action<select value={action} onChange={event=>setAction(event.target.value)}><option value=''>All actions</option>{[...new Set(result.items.map(row=>row.action))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
 <button onClick={()=>{setActor('');setAction('');}}>Clear activity filters</button><p role='status'>{visible.length} of {result.items.length} loaded events match.</p></fieldset>}
 <ol>{visible.map(row=><li key={row.id}><a href={healthReportHref(site,row.record)}>{row.title} · {row.locale}</a><p>{row.action} · <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time></p><p>Actor: {row.actorLabel??row.actorId??'System / no user recorded'}{row.actorLabel&&row.actorId?` (${row.actorId})`:''}{row.revision?` · Revision: ${row.revision}`:''}</p></li>)}</ol>
 {result?.nextCursor&&<button disabled={busy} onClick={()=>void load(result.nextCursor)}>Load older activity</button>}
 </section>;
}
