'use client';
import {useEffect,useRef,useState} from 'react';
import {RecordPicker,type ReferenceContext} from './record-picker';
const types={journey:'Journeys',destination:'Destinations',journalArticle:'Journal articles'} as const;
type Reference={recordId:string};
type Resolved={id:string;title?:string;available?:boolean;published?:boolean};
export function SettingsFeaturedEditor({value,onChange,context}:{value:Reference[];onChange:(value:Reference[])=>void;context:ReferenceContext}){
 const [type,setType]=useState<keyof typeof types>('journey');
 const [labels,setLabels]=useState<Resolved[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const api=useRef(context.api);api.current=context.api;
 const latest=useRef({value,onChange,context});latest.current={value,onChange,context};
 const ids=value.map(item=>item.recordId).join(',');
 useEffect(()=>{
  let active=true;setLabels([]);setError('');
  if(!ids)return;
  Promise.all(Object.keys(types).map(type=>api.current('/api/cms/references',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',site:context.site,type,records:ids.split(',')})}).then(response=>response.result as Resolved[])))
   .then(results=>{if(active)setLabels(results.flat().filter(row=>row.available));})
   .catch(()=>{if(active)setError('Featured content could not be checked. Retry before reviewing these settings.');});
  return()=>{active=false;};
 },[ids,context.site,retry]);
 function add(items:Reference[]){const current=latest.current;if(current.context.disabled)return;const item=items[0];if(!item||current.value.length>=12)return;if(current.value.some(ref=>ref.recordId===item.recordId)){setError('This record is already featured.');return;}current.onChange([...current.value,item]);}
 function move(index:number,direction:number){if(context.disabled)return;const next=[...value];[next[index],next[index+direction]]=[next[index+direction],next[index]];onChange(next);}
 return <fieldset disabled={context.disabled}><legend>Featured header content</legend>
  <p>Choose up to 12 journeys, destinations or journal articles. Their order below controls the featured order. Draft selections must be published and available before settings can be released.</p>
  {!value.length&&<p>No featured content selected.</p>}
  <ol>{value.map((item,index)=>{const row=labels.find(row=>row.id===item.recordId);return <li key={item.recordId}><strong>{row?.title||'Unverified featured record'}</strong><small>{row?(row.published?'Has a published revision':'Draft only'):item.recordId}</small><div className='cms-actions'><button type='button' disabled={context.disabled||index===0} onClick={()=>move(index,-1)}>Move featured item up</button><button type='button' disabled={context.disabled||index===value.length-1} onClick={()=>move(index,1)}>Move featured item down</button><button type='button' onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove featured item</button></div></li>;})}</ol>
  {error&&<p role='alert'>{error}</p>}<button type='button' disabled={!value.length} onClick={()=>setRetry(count=>count+1)}>Check featured content</button>
  <label>Featured content type<select value={type} onChange={event=>setType(event.target.value as keyof typeof types)}>{Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <RecordPicker key={`${context.site}:${type}`} type={type} value={[]} onChange={add} context={{...context,disabled:context.disabled||value.length>=12}} max={1}/>
 </fieldset>;
}
