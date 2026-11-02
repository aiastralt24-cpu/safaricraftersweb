'use client';
import {useId,useState} from 'react';
import type {ReactNode} from 'react';
import type {z} from 'zod';
import type {SectionImage,sectionDataSchemas} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepagePartners.css';
export type HomepagePartners=z.infer<typeof sectionDataSchemas.homepagePartners>;
export function CmsHomepagePartners({value,headingLevel:H='h2',renderImage}:{value:HomepagePartners;headingLevel?:'h1'|'h2'|'h3';renderImage:(image:SectionImage)=>ReactNode}){
 const prefix=useId(),[selected,setSelected]=useState(value.defaultRegionId);
 const active=value.regions.find(region=>region.id===selected)??value.regions.find(region=>region.id===value.defaultRegionId)??value.regions[0];
 return <div className='cms-home-partners'>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H><div role='tablist' aria-label='Partner regions'>{value.regions.map((region,index)=><button type='button' role='tab' id={`${prefix}-tab-${region.id}`} aria-controls={`${prefix}-panel-${region.id}`} aria-selected={active.id===region.id} tabIndex={active.id===region.id?0:-1} key={region.id} onClick={()=>setSelected(region.id)} onKeyDown={event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%value.regions.length;else if(event.key==='ArrowLeft')next=(index+value.regions.length-1)%value.regions.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=value.regions.length-1;else return;event.preventDefault();setSelected(value.regions[next].id);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();}}>{region.label}</button>)}</div>{value.regions.map(region=><div key={region.id} role='tabpanel' id={`${prefix}-panel-${region.id}`} aria-labelledby={`${prefix}-tab-${region.id}`} hidden={active.id!==region.id} tabIndex={0}>{active.id===region.id&&<ul>{region.items.map(item=><li key={item.id}><figure>{renderImage(item.image)}<figcaption>{item.name}{item.image.caption&&<span>{item.image.caption}</span>}{item.image.credit&&<small>{item.image.credit}</small>}</figcaption></figure></li>)}</ul>}</div>)}</div>;
}
