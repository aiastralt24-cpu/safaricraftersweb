'use client';
import type {HomepageJourneyTypes} from '../../components/CmsHomepageJourneyTypes';
import {EditorialHeadingEditor} from './editorial-heading-editor';
import {EditorialCopyEditor} from './editorial-copy-editor';
import {SectionImageEditor} from './section-image-editor';
import type {ImageEditorContext} from './section-image-editor';
import {SectionButtonsEditor} from './section-buttons-editor';
import {newHomepageJourneyType} from '../../lib/cms/section-drafts';
export function HomepageJourneyTypesFields({value,onChange,context}:{value:HomepageJourneyTypes;onChange:(value:HomepageJourneyTypes)=>void;context:ImageEditorContext}){
 function update(index:number,patch:Partial<HomepageJourneyTypes['items'][number]>){onChange({...value,items:value.items.map((item,i)=>index===i?{...item,...patch}:item)});}
 function move(index:number,offset:number){const items=[...value.items];[items[index],items[index+offset]]=[items[index+offset],items[index]];onChange({...value,items});}
 return <fieldset disabled={context.disabled}><legend>Ways to journey</legend><EditorialHeadingEditor value={value.heading} onChange={heading=>onChange({...value,heading})}/>{value.items.map((item,index)=><fieldset key={item.id}><legend>Journey type {index+1}</legend><EditorialHeadingEditor value={item.heading} onChange={heading=>update(index,{heading})}/><EditorialCopyEditor value={item.copy} onChange={copy=>update(index,{copy})}/><SectionImageEditor label='Journey type image' value={item.image} context={context} onChange={image=>update(index,{image})}/><SectionButtonsEditor min={1} max={1} value={[item.link]} onChange={links=>update(index,{link:links[0]})}/><button type='button' disabled={index===0} onClick={()=>move(index,-1)}>Move journey type up</button><button type='button' disabled={index===value.items.length-1} onClick={()=>move(index,1)}>Move journey type down</button><button type='button' disabled={value.items.length===1} onClick={()=>onChange({...value,items:value.items.filter((_,i)=>i!==index)})}>Remove journey type</button></fieldset>)}<button type='button' disabled={value.items.length>=12} onClick={()=>onChange({...value,items:[...value.items,newHomepageJourneyType(crypto.randomUUID())]})}>Add journey type</button></fieldset>;
}
