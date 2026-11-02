'use client';
import {useId,useState} from 'react';
import type {z} from 'zod';
import {guidedSectionSchemas,type GuidedSectionKind} from '../../lib/cms/guided-safaris-content';
import {CmsEditorialHeading} from '../../components/CmsEditorialHeading';
import {heroFramingStyle} from '../../lib/cms/hero-framing';
import {MediaImage,type LoadMediaPreview} from './media-image';
import '../../components/CmsHeroFraming.css';

type Media=z.infer<typeof guidedSectionSchemas.guidedHero>['media'];
type Link=z.infer<typeof guidedSectionSchemas.guidedHero>['button'];
function Action({value}:{value:Link}){return <a href={value.href} target={value.newWindow?'_blank':undefined} rel={value.newWindow?'noopener noreferrer':undefined}>{value.label}</a>;}
function Picture({value,load}:{value:Media;load:LoadMediaPreview}){
 const render=(image:Media['image'])=><figure className='cms-hero-framing hero-breakpoint-760' style={heroFramingStyle(value.desktopFraming,value.mobileFraming)}><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={load}/>{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
 return <><div className={value.mobileImage?'cms-preview-desktop-image':undefined}>{render(value.image)}</div>{value.mobileImage&&<div className='cms-preview-mobile-image'>{render(value.mobileImage)}</div>}</>;
}
function Questions({value}:{value:z.infer<typeof guidedSectionSchemas.guidedFaq>}){
 const prefix=useId(),[open,setOpen]=useState(value.initialOpenId);
 return <div>{value.items.map(item=><div key={item.id}><button type='button' id={`${prefix}-question-${item.id}`} aria-expanded={open===item.id} aria-controls={`${prefix}-answer-${item.id}`} onClick={()=>setOpen(current=>current===item.id?null:item.id)}>{item.question}</button><div id={`${prefix}-answer-${item.id}`} role='region' aria-labelledby={`${prefix}-question-${item.id}`} hidden={open!==item.id}><p style={{whiteSpace:'pre-wrap'}}>{item.answer}</p></div></div>)}</div>;
}
export function GuidedSectionPreview({kind,value,headingLevel,load}:{kind:GuidedSectionKind;value:unknown;headingLevel:'h1'|'h2'|'h3';load:LoadMediaPreview}){
 const H=headingLevel,ItemH=headingLevel==='h1'?'h2':headingLevel==='h2'?'h3':'h4';
 const title=(d:{eyebrow:string;heading:z.infer<typeof guidedSectionSchemas.guidedHero>['heading']})=><><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></>;
 const paragraphs=(items:{id:string;text:string}[])=>items.map(item=><p key={item.id} style={{whiteSpace:'pre-wrap'}}>{item.text}</p>);
 if(kind==='guidedHero'){const d=guidedSectionSchemas.guidedHero.parse(value);return <>{title(d)}<p>{d.copy}</p><Picture value={d.media} load={load}/><Action value={d.button}/><p><a href={d.scrollCue.anchor} aria-label={d.scrollCue.accessibleLabel}>{d.scrollCue.label}</a></p></>;}
 if(kind==='guidedIntroduction'){const d=guidedSectionSchemas.guidedIntroduction.parse(value);return <>{title(d)}{paragraphs(d.paragraphs)}</>;}
 if(kind==='guidedEncounter'){const d=guidedSectionSchemas.guidedEncounter.parse(value);return <div role='group' aria-label={d.accessibleLabel}><Picture value={d.media} load={load}/><p role='note'>{d.expandOnScroll?'Expanding scroll presentation requested.':'Static image presentation requested.'} Motion is not shown in this draft preview.</p></div>;}
 if(kind==='guidedPhotography'){const d=guidedSectionSchemas.guidedPhotography.parse(value);return <>{title(d)}{paragraphs(d.paragraphs)}<blockquote>{d.quotation}</blockquote><Picture value={d.media} load={load}/></>;}
 if(kind==='guidedCompanion'){const d=guidedSectionSchemas.guidedCompanion.parse(value);return <>{title(d)}{paragraphs(d.paragraphs)}<Picture value={d.media} load={load}/>{d.button?.enabled&&<Action value={d.button.link}/>}</>;}
 if(kind==='guidedFaq'){const d=guidedSectionSchemas.guidedFaq.parse(value);return <>{title(d)}<Questions key={JSON.stringify([d.initialOpenId,d.items.map(item=>item.id)])} value={d}/></>;}
 const d=kind==='guidedFieldCards'?guidedSectionSchemas.guidedFieldCards.parse(value):guidedSectionSchemas.guidedPaths.parse(value);
 return <>{title(d)}{'introduction'in d&&<p>{d.introduction}</p>}{'mobileLayout'in d&&<p role='note'>Mobile website layout: {d.mobileLayout}. Cards are listed here for content review.</p>}<div className='cms-preview-cards'>{d.items.map(item=><article key={item.id}><Picture value={item.media} load={load}/><p className='eyebrow'>{item.eyebrow}</p><ItemH><CmsEditorialHeading value={item.heading}/></ItemH><p>{item.copy}</p>{'action'in item&&<Action value={item.action}/>}</article>)}</div></>;
}
