'use client';
import {useEffect,useRef,useState} from 'react';
import type {NavigationItem} from '../../lib/cms/navigation';
import {navigationItemSchema} from '../../lib/cms/navigation';
import {RecordPicker,type ReferenceContext} from './record-picker';
const types=['journey','destination','journalArticle'] as const;
export function NavigationRulesEditor({item,onChange,context}:{item:NavigationItem;onChange:(patch:Partial<NavigationItem>)=>void;context:ReferenceContext}){
 const [type,setType]=useState<string>('journey'),[labels,setLabels]=useState<Record<string,string>>({}),[error,setError]=useState('');
 const current=useRef({item,onChange,context});current.current={item,onChange,context};
 const key=item.featuredContent.map(ref=>ref.recordId).join(',');
 useEffect(()=>{
  let active=true;setLabels({});setError('');const ids=current.current.item.featuredContent.map(ref=>ref.recordId);if(!ids.length)return;
  Promise.all(types.map(async contentType=>{
   const result=(await current.current.context.api('/api/cms/references',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',site:context.site,type:contentType,records:ids})})).result;
   if(!Array.isArray(result)||result.length!==ids.length||result.some((row,index)=>row.id!==ids[index]))throw Error('Invalid featured record response.');return result;
  })).then(groups=>{if(active){const names:Record<string,string>={};for(const rows of groups)for(const row of rows)if(row.available&&typeof row.title==='string')names[row.id]=`${row.title}${row.published?'':' · Draft only'}`;setLabels(names);}}).catch(()=>{if(active)setError('Featured records could not be checked. Existing selections are preserved.');});
  return()=>{active=false;};
 },[key,context.site]);
 function visibility(patch:Partial<NavigationItem['visibility']>){onChange({visibility:{...item.visibility,...patch}});}
 function move(index:number,offset:number){const next=[...item.featuredContent];[next[index],next[index+offset]]=[next[index+offset],next[index]];onChange({featuredContent:next});}
 const parsed=navigationItemSchema.safeParse(item);
 return <details><summary>Visibility schedule and featured content</summary><fieldset disabled={context.disabled}>
 <p>Start is inclusive; end is exclusive. Enter an ISO date and time with a timezone, such as 2026-11-01T09:00:00+05:30. Clear a date to remove that limit.</p>
 <label>Visible from<input value={item.visibility.from??''} onChange={e=>visibility({from:e.target.value||undefined})} placeholder='2026-11-01T09:00:00+05:30'/></label>
 <label>Visible until<input value={item.visibility.until??''} onChange={e=>visibility({until:e.target.value||undefined})} placeholder='2026-12-01T09:00:00+05:30'/></label>
 {(['locales','regions'] as const).map(field=><section key={field}><h4>{field==='locales'?'Allowed languages':'Allowed regions'}</h4><p>{field==='locales'?'Empty means every language. Use language codes such as en or fr.':'Empty means every region. Region-restricted items stay hidden until the website can identify a matching region.'}</p>{item.visibility[field].map((value,index)=><div key={index}><label>{field==='locales'?'Language':'Region'} {index+1}<input value={value} maxLength={field==='locales'?10:128} onChange={e=>visibility({[field]:item.visibility[field].map((v,i)=>i===index?e.target.value:v)})}/></label><button type='button' onClick={()=>visibility({[field]:item.visibility[field].filter((_,i)=>i!==index)})}>Remove {field==='locales'?'language':'region'} {index+1}</button></div>)}<button type='button' disabled={item.visibility[field].length>=(field==='locales'?30:100)} onClick={()=>visibility({[field]:[...item.visibility[field],'']})}>Add {field==='locales'?'language':'region'}</button></section>)}
 <h4>Featured content</h4><ol>{item.featuredContent.map((ref,index)=><li key={`${ref.recordId}:${index}`}><strong>{labels[ref.recordId]||'Unavailable or unchecked record'}</strong><small>{ref.recordId}</small><button type='button' disabled={index===0} onClick={()=>move(index,-1)}>Move featured item up</button><button type='button' disabled={index===item.featuredContent.length-1} onClick={()=>move(index,1)}>Move featured item down</button><button type='button' onClick={()=>onChange({featuredContent:item.featuredContent.filter((_,i)=>i!==index)})}>Remove featured item</button></li>)}</ol>
 <label>Featured content type<select value={type} onChange={e=>setType(e.target.value)}>{types.map(value=><option key={value} value={value}>{value==='journalArticle'?'Journal article':value==='journey'?'Journey':'Destination'}</option>)}</select></label>
 <RecordPicker key={type} type={type} value={[]} max={1} context={{...context,disabled:context.disabled||item.featuredContent.length>=6}} onChange={selected=>{const latest=current.current;if(!selected[0]||latest.context.disabled||latest.item.featuredContent.length>=6)return;if(latest.item.featuredContent.some(ref=>ref.recordId===selected[0].recordId)){setError('That featured record is already selected.');return;}setError('');latest.onChange({featuredContent:[...latest.item.featuredContent,selected[0]]});}}/>
 {error&&<p role='alert'>{error}</p>}{!parsed.success&&<ul role='alert'>{parsed.error.issues.filter(issue=>issue.path[0]==='visibility'||issue.path[0]==='featuredContent').map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}
 </fieldset></details>;
}
