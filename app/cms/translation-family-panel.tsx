'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedTranslationFamily,type TranslationFamily,type TranslationFamilyEntry} from '../../lib/cms/translation-family';
type Props={site:string;record:string;type:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onLoaded:(record:any)=>void|Promise<void>;onWorking:(busy:boolean)=>void};
const labels={unreviewed:'Not reviewed',source_changed:'Source changed',translation_changed:'Translation changed',current:'Review current'};
export function TranslationFamilyPanel({site,record,type,disabled,api,onLoaded,onWorking}:Props){
 const [family,setFamily]=useState<TranslationFamily|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(true),pending=useRef(false),working=useRef(onWorking);working.current=onWorking;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(pending.current)working.current(false);};},[]);
 async function run(entry?:TranslationFamilyEntry,after?:string){
  if(disabled||pending.current)return;pending.current=true;setBusy(true);setMessage('');onWorking(true);
  try{
   if(entry){
    const response=await api(`/api/cms/content?site=${encodeURIComponent(site)}&record=${encodeURIComponent(entry.id)}`),value=response.record;
    if(!alive.current)return;
    if(!value||value.id!==entry.id||value.type!==type||value.locale!==entry.locale||value.path!==entry.path||typeof value.currentRevision!=='string'||!value.payload||!value.permissions||!Array.isArray(value.history))throw Error('The selected record changed or is unavailable. Refresh the translation list.');
    await onLoaded(value);
   }else{
    const response=await api('/api/cms/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'family',site,record,...(after?{after}:{})})}),result=verifiedTranslationFamily(response.result,record,after);
    if(result.source.type!==type)throw Error('The translation list has a different content type. Reload the editor.');
    if(alive.current)setFamily(result);
   }
  }catch(e){if(alive.current){setFamily(null);setMessage(e instanceof Error?e.message:'Translation navigation failed. Refresh the list.');}}
  finally{pending.current=false;if(alive.current){setBusy(false);working.current(false);}}
 }
 function row(entry:TranslationFamilyEntry,status:string){return <li key={entry.id}><p><strong>{entry.title}</strong> · {entry.locale} · {status}{entry.id===record?' · Current record':''}</p><button type='button' disabled={disabled||busy||entry.id===record} onClick={()=>void run(entry)}>Open {entry.locale} {status==='Source'?'source':'translation'}</button></li>;}
 return <details className='cms-history'><summary>Source and translations</summary><p>Find the primary source and translations you can view. Opening a record loads its latest saved draft; it does not change or publish content.</p><button type='button' disabled={disabled||busy} onClick={()=>void run()}>Refresh source and translations</button>{message&&<p role='status'>{message}</p>}{family&&<><ul aria-label='Related language records'>{row(family.source,'Source')}{family.translations.map(entry=>row(entry,labels[entry.status]))}</ul>{family.translations.length===0&&<p>No viewable translations on this page.</p>}{family.nextCursor&&<button type='button' disabled={disabled||busy} onClick={()=>void run(undefined,family.nextCursor!)}>Next translations</button>}</>}</details>;
}
