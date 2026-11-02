'use client';
import {useEffect,useRef} from 'react';
import {startKenyaMotion} from '../../lib/cms/kenya-motion';
import {ArrowUpRight,X} from 'lucide-react';
import {CmsTanzaniaSection,type TanzaniaSection,type TanzaniaPlanner} from '../../components/CmsTanzaniaSection';
import {tanzaniaSectionSchemas,type TanzaniaSectionKind} from '../../lib/cms/tanzania-country-sections';
import type {Composition,SectionImage} from '../../lib/cms/composition';
import {CountryGalleryPreview} from './kenya-section-preview';
import {MediaImage,type LoadMediaPreview} from './media-image';
import '../../components/CountryPlannerTrigger.css';
import './tanzania-section-preview.css';
function Planner({value,className='kenya-text-link'}:{value:TanzaniaPlanner;className?:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 return <><button type='button' className={className} onClick={()=>dialog.current?.showModal()}>{value.label}<ArrowUpRight size={18} aria-hidden='true'/></button><dialog ref={dialog} className='country-planner-dialog' aria-label={value.dialogLabel} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}><header className='country-planner-header'><div><p className='eyebrow'>{value.dialogEyebrow}</p><h2>{value.interest}</h2></div><button type='button' autoFocus className='country-planner-close' aria-label={value.closeLabel} onClick={()=>dialog.current?.close()}><X aria-hidden='true'/></button></header><div className='country-planner-body'><p>Draft planner preview. No enquiry is submitted.</p><dl><dt>Region</dt><dd>{value.region}</dd><dt>Journey type</dt><dd>Private</dd><dt>Initial note</dt><dd>I am interested in {value.interest}.</dd></dl></div></dialog></>;
}
export function TanzaniaSectionPreview({section,load,motionKey}:{motionKey?:number;section:Composition['sections'][number];load:LoadMediaPreview}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(motionKey!==undefined&&root.current)return startKenyaMotion(root.current);},[motionKey,section.data,section.controls]);
 const parsed=tanzaniaSectionSchemas[section.kind as TanzaniaSectionKind].safeParse(section.data);
 if(!parsed.success)return <p role='alert'>Complete the Tanzania section before previewing.</p>;
 const renderImage=(image:SectionImage)=><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={load}/>;
 return <div ref={root} className='kenya-page tanzania-page cms-kenya-preview' onClick={event=>{const link=(event.target as Element).closest('a');if(!link)return;event.preventDefault();const href=link.getAttribute('href');if(href?.startsWith('#'))link.ownerDocument.getElementById(href.slice(1))?.scrollIntoView();}} onAuxClick={event=>{if((event.target as Element).closest('a'))event.preventDefault();}}><CmsTanzaniaSection section={{...section,data:parsed.data} as TanzaniaSection} renderImage={renderImage} renderGallery={data=><CountryGalleryPreview data={data} renderImage={renderImage}/>} renderPlanner={(value,className)=><Planner value={value} className={className}/>}/></div>;
}
