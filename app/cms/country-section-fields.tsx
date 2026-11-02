'use client';
import type {ReactNode} from 'react';
import {EditorialHeadingEditor} from './editorial-heading-editor';
import {SectionImageEditor,type ImageEditorContext} from './section-image-editor';
type Value=Record<string,any>;
const label=(value:string)=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase());
export function CountrySectionFields({name,defaults,value,onChange,context,arrayLimits={},textLimits={},notice}:{name:string;defaults:Value;value:Value;onChange:(value:Value)=>void;context:ImageEditorContext;arrayLimits?:Record<string,number>;textLimits?:Record<string,number>;notice:string}){
 function fields(current:Value,blank:Value,change:(value:Value)=>void,prefix:string):ReactNode{
  return Object.keys({...blank,...current}).filter(key=>key!=='id').map(key=>{
   const item=current[key],seed=blank[key],name=`${prefix} ${label(key).toLowerCase()}`;
   const update=(next:any)=>change({...current,[key]:next});
   if(key==='image')return <SectionImageEditor key={key} label={name} value={item} context={context} onChange={update}/>;
   if(key==='heading')return <fieldset key={key}><legend>{name}</legend><EditorialHeadingEditor value={item} onChange={update}/></fieldset>;
   if(key==='focalPoint')return <fieldset key={key}><legend>{name}</legend>{['x','y'].map(axis=><label key={axis}>{name} {axis}<input aria-label={`${name} ${axis}`} type='range' min={0} max={100} value={item?.[axis]??50} onChange={e=>update({...item,[axis]:Number(e.target.value)})}/></label>)}</fieldset>;
   if(Array.isArray(seed)||Array.isArray(item)){
    const rows:Value[]=item??[],base:Value=seed?.[0]??{},max=arrayLimits[key]??(key==='breadcrumbs'?10:key==='images'?30:20);
    return <fieldset key={key}><legend>{name}</legend>{rows.map((row,index)=><fieldset key={row.id}><legend>{name} {index+1}</legend>{fields(row,key==='breadcrumbs'?{label:'',href:''}:base,next=>update(rows.map((r,i)=>i===index?next:r)),`${name} ${index+1}`)}<button type='button' disabled={index===0} onClick={()=>{const next=[...rows];[next[index-1],next[index]]=[next[index],next[index-1]];update(next);}}>Move {name} {index+1} up</button><button type='button' disabled={index===rows.length-1} onClick={()=>{const next=[...rows];[next[index+1],next[index]]=[next[index],next[index+1]];update(next);}}>Move {name} {index+1} down</button><button type='button' disabled={rows.length===1} onClick={()=>update(rows.filter((_,i)=>i!==index))}>Remove {name} {index+1}</button></fieldset>)}<button type='button' disabled={rows.length>=max} onClick={()=>update([...rows,{...structuredClone(base),id:crypto.randomUUID()}])}>Add {name}</button></fieldset>;
   }
   if(typeof item==='boolean'||typeof seed==='boolean')return <label key={key}><input type='checkbox' checked={Boolean(item)} onChange={e=>update(e.target.checked)}/>{name}</label>;
   if(typeof seed==='object'&&seed!==null||typeof item==='object'&&item!==null)return <fieldset key={key}><legend>{name}</legend>{fields(item??{},seed??{},update,name)}</fieldset>;
   const area=['copy','text','answer','note','caption','imageCaption','lead'].includes(key),max=textLimits[key]??(key==='href'?2048:key==='answer'||key==='text'?10000:key==='copy'||key==='lead'?4000:key==='caption'||key==='imageCaption'||key==='note'?2000:key==='subtitle'||key==='question'||key==='interest'?500:key==='dialogLabel'?600:key==='closeLabel'||key==='region'?100:key==='focus'||key==='value'?1000:200);
   const edit=(text:string)=>{if(key==='href'&&prefix.includes('breadcrumbs')&&!text){const next={...current};delete next.href;change(next);}else update(text);};
   return <label key={key}>{name}{area?<textarea aria-label={name} maxLength={max} value={item??''} onChange={e=>edit(e.target.value)}/>:<input aria-label={name} maxLength={max} value={item??''} onChange={e=>edit(e.target.value)}/>}</label>;
  });
 }
 return <fieldset disabled={context.disabled}><legend>{name}</legend><p>{notice}</p>{fields(value,defaults,onChange,name)}</fieldset>;
}
