import type {ReactNode} from 'react';
import type {z} from 'zod';
import {ArrowDown,ArrowUpRight} from 'lucide-react';
import type {GuidedPageSection} from '../lib/cms/guided-safaris-page';
import type {guidedSectionSchemas} from '../lib/cms/guided-safaris-content';
import type {SectionImage} from '../lib/cms/composition';
import {heroFramingStyle} from '../lib/cms/hero-framing';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import {CmsGuidedMotion} from './CmsGuidedMotion';
import {CmsGuidedFaq} from './CmsGuidedFaq';
import '../app/guided-bespoke-safaris/guided-bespoke-safaris.css';
import './CmsGuidedPage.css';
type Media=z.infer<typeof guidedSectionSchemas.guidedHero>['media'];
type Link=z.infer<typeof guidedSectionSchemas.guidedHero>['button'];
type RenderImage=(image:SectionImage,priority:boolean)=>ReactNode;
const classes={guidedHero:'guided-hero',guidedIntroduction:'guided-introduction',guidedEncounter:'guided-expand-shell',guidedFieldCards:'guided-field',guidedPhotography:'guided-photography',guidedCompanion:'guided-person',guidedPaths:'guided-paths',guidedFaq:'guided-faq'};
function Action({value}:{value:Link}){return <a href={value.href} target={value.newWindow?'_blank':undefined} rel={value.newWindow?'noopener noreferrer':undefined}>{value.label} <ArrowUpRight aria-hidden='true' size={17}/></a>;}
function Picture({value,className,renderImage,priority=false}:{value:Media;className:string;renderImage:RenderImage;priority?:boolean}){
 const caption=value.image.caption||value.image.credit,mobileCaption=value.mobileImage&&(value.mobileImage.caption||value.mobileImage.credit);
 return <figure className={`${className} cms-guided-media`} data-desktop-shape={value.desktopFraming.shape} data-mobile-shape={value.mobileFraming.shape} style={heroFramingStyle(value.desktopFraming,value.mobileFraming)}><div className={value.mobileImage?'cms-guided-desktop':'cms-guided-single'}>{renderImage(value.image,priority)}</div>{value.mobileImage&&<div className='cms-guided-mobile'>{renderImage(value.mobileImage,false)}</div>}{caption&&<figcaption className={value.mobileImage?'cms-guided-desktop':undefined}>{[value.image.caption,value.image.credit].filter(Boolean).join(' · ')}</figcaption>}{mobileCaption&&<figcaption className='cms-guided-mobile'>{[value.mobileImage?.caption,value.mobileImage?.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
}
function Section({section,renderImage}:{section:GuidedPageSection;renderImage:RenderImage}){
 const H=section.controls.headingLevel,Child=H==='h1'?'h2':H==='h2'?'h3':'h4',headingId=`cms-guided-${section.id}-heading`;
 const title=(d:{eyebrow:string;heading:MediaHeading})=><><p className='eyebrow'>{d.eyebrow}</p><H className='cms-guided-heading' id={headingId}><CmsEditorialHeading value={d.heading}/></H></>;
 const paragraphs=(items:{id:string;text:string}[])=>items.map(item=><p key={item.id}>{item.text}</p>);
 let body:ReactNode;
 switch(section.kind){
 case 'guidedHero':{const d=section.data;body=<><div className='guided-hero-copy'>{title(d)}<p>{d.copy}</p><Action value={d.button}/></div><Picture value={d.media} className='guided-hero-media' renderImage={renderImage} priority/><a className='guided-scroll-cue' href={d.scrollCue.anchor} aria-label={d.scrollCue.accessibleLabel}><span>{d.scrollCue.label}</span><ArrowDown aria-hidden='true' size={17}/></a></>;break;}
 case 'guidedIntroduction':{const d=section.data;body=<div className='guided-introduction-inner'>{title(d)}<div className='guided-introduction-copy'>{paragraphs(d.paragraphs)}</div></div>;break;}
 case 'guidedEncounter':body=<Picture value={section.data.media} className='guided-expand-media' renderImage={renderImage}/>;break;
 case 'guidedFieldCards':{const d=section.data;body=<><header className='guided-field-heading'>{title(d)}<p>{d.introduction}</p></header><div className={`guided-field-grid mobile-${d.mobileLayout}`} tabIndex={d.mobileLayout==='horizontal'?0:undefined} role='region' aria-labelledby={headingId}>{d.items.map(item=><article key={item.id}><Picture value={item.media} className='guided-field-image' renderImage={renderImage}/><p className='eyebrow'>{item.eyebrow}</p><Child className='cms-guided-card-heading'><CmsEditorialHeading value={item.heading}/></Child><p>{item.copy}</p></article>)}</div></>;break;}
 case 'guidedPhotography':{const d=section.data;body=<><Picture value={d.media} className='guided-photography-image' renderImage={renderImage}/><div className='guided-photography-copy'>{title(d)}{paragraphs(d.paragraphs)}<blockquote>{d.quotation}</blockquote></div></>;break;}
 case 'guidedCompanion':{const d=section.data;body=<><div className='guided-person-copy'>{title(d)}{paragraphs(d.paragraphs)}{d.button?.enabled&&<Action value={d.button.link}/>}</div><Picture value={d.media} className='guided-person-image' renderImage={renderImage}/></>;break;}
 case 'guidedPaths':{const d=section.data;body=<><header>{title(d)}</header><div className='guided-paths-grid'>{d.items.map(item=><a key={item.id} href={item.action.href} target={item.action.newWindow?'_blank':undefined} rel={item.action.newWindow?'noopener noreferrer':undefined}><Picture value={item.media} className='guided-path-image' renderImage={renderImage}/><span className='eyebrow'>{item.eyebrow}</span><Child className='cms-guided-card-heading'><CmsEditorialHeading value={item.heading}/></Child><p>{item.copy}</p><strong>{item.action.label} <ArrowUpRight aria-hidden='true' size={17}/></strong></a>)}</div></>;break;}
 case 'guidedFaq':{const d=section.data;body=<><header>{title(d)}</header><CmsGuidedFaq key={JSON.stringify([d.initialOpenId,d.items.map(i=>i.id)])} items={d.items} initialOpenId={d.initialOpenId} headingLevel={Child}/></>;break;}
 }
 return <section id={section.controls.anchor} className={`${classes[section.kind]} background-${section.controls.background} width-${section.controls.width} spacing-${section.controls.spacing} align-${section.controls.textAlign} media-${section.controls.mediaAlign} mobile-${section.controls.mobileOrder}`} aria-labelledby={section.kind==='guidedEncounter'?undefined:headingId} aria-label={section.kind==='guidedEncounter'?section.data.accessibleLabel:undefined} data-section-id={section.id} data-cms-motion={section.controls.animation} data-cms-expand={section.kind==='guidedEncounter'?section.data.expandOnScroll:undefined}>{body}</section>;
}
type MediaHeading=z.infer<typeof guidedSectionSchemas.guidedHero>['heading'];
/** Caller owns audience projection and media authorization. This renderer alone
 * does not authorize public delivery. */
export function CmsGuidedPage({page,renderImage}:{page:{sections:GuidedPageSection[];revisionId:string};renderImage:RenderImage}){return <CmsGuidedMotion revisionKey={page.revisionId}>{page.sections.map(section=><Section key={section.id} section={section} renderImage={renderImage}/>)}</CmsGuidedMotion>;}
