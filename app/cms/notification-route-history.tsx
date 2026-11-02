'use client';
import {useEffect,useRef,useState} from 'react';
import {verifyNotificationRouteHistory} from '../../lib/cms/notification-routes';
type Entry=ReturnType<typeof verifyNotificationRouteHistory>['items'][number];
export function NotificationRouteHistory({site,routeId,label,api,disabled}:{site:string;routeId:string;label:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean}){
 const [rows,setRows]=useState<Entry[]>([]),[loaded,setLoaded]=useState(false),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 async function load(append=false){const ticket=++generation.current;setBusy(true);setError('');const after=append?rows.at(-1)?.revisionId??null:null;
 try{const result=await api('/api/cms/notification-routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'history',site,routeId,after})});const value=verifyNotificationRouteHistory(result.result,site,routeId,after);
 if(append&&value.items.some(v=>rows.some(r=>r.revisionId===v.revisionId)))throw Error('Recipient history overlaps the loaded page. Reload history.');
 if(ticket===generation.current){setRows(old=>append?[...old,...value.items]:value.items);setMore(value.items.length===30);setLoaded(true);}
 }catch(reason){if(ticket===generation.current){setRows([]);setLoaded(false);setMore(false);setError(reason instanceof Error?reason.message:'Recipient history is unavailable.');}}finally{if(ticket===generation.current)setBusy(false);}}
 return <details><summary>History for {label}</summary><p>Saved recipient configurations and the administrator who changed them. This history does not confirm email delivery.</p><button disabled={disabled||busy} onClick={()=>void load()}>Load recipient history</button>{error&&<p role='alert'>{error}</p>}{loaded&&!rows.length&&<p>No recorded revisions. This route may predate administration history.</p>}<ol>{rows.map(row=><li key={row.revisionId}><h5>{row.action==='save'?'Recipients saved':row.action==='approve'?'Recipients approved':'Recipients disabled'}</h5><p><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time></p><p>Administrator: {row.actorId}</p><p>From: {row.snapshot.from}</p><ul>{row.snapshot.to.map(email=><li key={email}>{email}</li>)}</ul><p>Revision: {row.revisionId}</p></li>)}</ol>{more&&<button disabled={disabled||busy} onClick={()=>void load(true)}>Older recipient revisions</button>}</details>;
}
