'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {startKenyaMotion} from '../../lib/cms/kenya-motion';
import type {z} from 'zod';
import {CmsKenyaSection,type KenyaSection} from '../../components/CmsKenyaSection';
import {kenyaSectionSchemas,type KenyaSectionKind} from '../../lib/cms/kenya-country-sections';
import type {SectionImage} from '../../lib/cms/composition';
import {MediaImage,type LoadMediaPreview} from './media-image';
import '../../components/MediaGallery.css';
export function CountryGalleryPreview({data,renderImage}:{data:z.infer<typeof kenyaSectionSchemas.kenyaGallery>;renderImage:(image:SectionImage)=>ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),[active,setActive]=useState(0);
 const image=data.images[active]?.image??data.images[0].image;
 const move=(delta:number)=>setActive(index=>(index+delta+data.images.length)%data.images.length);
 return <><div className={`gallery-grid gallery-count-${data.images.length}`} aria-label={data.accessibleLabel}>{data.images.map((item,index)=><button type='button' className='gallery-trigger' key={item.id} aria-label={`Open image ${index+1} of ${data.images.length}: ${item.image.alt}`} onClick={()=>{setActive(index);dialog.current?.showModal();}}>{renderImage(item.image)}<span>{String(index+1).padStart(2,'0')}</span></button>)}</div><dialog ref={dialog} className='cms-kenya-lightbox' aria-label={`${data.accessibleLabel} image viewer`} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}><button type='button' autoFocus onClick={()=>dialog.current?.close()}>Close image viewer</button><figure>{renderImage(image)}<figcaption aria-live='polite'>{image.alt} · {active+1} / {data.images.length}{image.credit&&` · ${image.credit}`}</figcaption></figure>{data.images.length>1&&<div><button type='button' onClick={()=>move(-1)}>Previous image</button><button type='button' onClick={()=>move(1)}>Next image</button></div>}</dialog></>;
}
export function KenyaSectionPreview({kind,value,id,controls,load,motionKey}:{motionKey?:number;kind:KenyaSectionKind;value:unknown;id:string;controls:KenyaSection['controls'];load:LoadMediaPreview}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(motionKey!==undefined&&root.current)return startKenyaMotion(root.current);},[motionKey,value,controls]);
 const parsed=kenyaSectionSchemas[kind].safeParse(value);
 if(!parsed.success)return <p role='alert'>Complete the {kind} fields before previewing this section.</p>;
 const renderImage=(image:SectionImage)=><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={load}/>;
 return <div ref={root} className='kenya-page cms-kenya-preview' onClick={event=>{const link=(event.target as Element).closest('a');if(!link)return;event.preventDefault();const href=link.getAttribute('href');if(href?.startsWith('#'))link.ownerDocument.getElementById(href.slice(1))?.scrollIntoView();}} onAuxClick={event=>{if((event.target as Element).closest('a'))event.preventDefault();}}><CmsKenyaSection section={{kind,data:parsed.data,id,controls} as KenyaSection} renderImage={renderImage} renderGallery={data=><CountryGalleryPreview data={data} renderImage={renderImage}/>}/></div>;
}
