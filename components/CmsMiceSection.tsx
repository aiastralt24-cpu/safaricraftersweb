import type {CSSProperties,ReactNode} from 'react';
import type {MicePageSection} from '../lib/cms/mice-page';
import type {SectionImage} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import '../app/mice/mice.css';
import './PageHero.css';
import './CmsMiceSection.css';
type Props={section:MicePageSection;renderImage:(image:SectionImage,priority:boolean)=>ReactNode;renderForm:(recordId:string)=>ReactNode};
/** Media/form callbacks retain responsibility for access and submission policy. */
export function CmsMiceSection({section,renderImage,renderForm}:Props){
 const H=section.controls.headingLevel,Child=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const heading=(d:{eyebrow:string;heading:Extract<MicePageSection,{kind:'miceHero'}>['data']['heading']})=><><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></>;
 const picture=(d:{image:SectionImage;focalPoint:{x:number;y:number}},priority=false)=><figure className='cms-mice-image' style={{'--mice-position':`${d.focalPoint.x}% ${d.focalPoint.y}%`} as CSSProperties}>{renderImage(d.image,priority)}{(d.image.caption||d.image.credit)&&<figcaption>{[d.image.caption,d.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
 const action=(d:{label:string;href:string},className?:string)=><a className={className} href={d.href}>{d.label}</a>;
 let body:ReactNode,className='';
 switch(section.kind){
 case 'miceHero':{const d=section.data;className='page-hero page-hero-destination cms-mice-hero';body=<>{picture(d,true)}<div className='page-hero-scrim'/><div className='container page-hero-content'><p className='page-hero-meta'>{d.eyebrow}</p><H className='h1'><CmsEditorialHeading value={d.heading}/></H><p className='page-hero-description'>{d.copy}</p><nav aria-label='Breadcrumb'><ol className='cms-mice-breadcrumbs'>{d.breadcrumbs.map((b,i)=><li key={b.id}>{b.href?<a href={b.href}>{b.label}</a>:<span aria-current={i===d.breadcrumbs.length-1?'page':undefined}>{b.label}</span>}</li>)}</ol></nav></div></>;break;}
 case 'miceIntroduction':{const d=section.data;className='container mice-intro';body=<><div>{heading(d)}</div><div>{d.paragraphs.map(p=><p key={p.id}>{p.text}</p>)}{action(d.button,'button button-solid')}</div></>;break;}
 case 'miceFormats':{const d=section.data;className='container mice-formats';body=<div role='group' aria-label={d.accessibleLabel} className='cms-mice-formats-grid'>{d.items.map((item,i)=><article key={item.id}><span>{String(i+1).padStart(2,'0')}</span><H>{item.title}</H><p>{item.copy}</p></article>)}</div>;break;}
 case 'miceDestinations':{const d=section.data;className='container mice-destinations';body=<><header>{heading(d)}<p>{d.copy}</p></header><div className='mice-destination-grid'>{d.items.map(item=><article key={item.id}><div className='mice-destination-image'>{picture(item)}</div><div><Child>{item.title}</Child><p>{item.copy}</p>{action(item.button)}</div></article>)}</div></>;break;}
 case 'miceProcess':{const d=section.data;className='mice-process';body=<div className='container'>{heading(d)}<ol>{d.items.map(item=><li key={item.id}><Child>{item.title}</Child><p>{item.copy}</p></li>)}</ol></div>;break;}
 case 'miceEnquiry':{const d=section.data;className='container form-grid mice-enquiry';body=<><div>{heading(d)}<p>{d.copy}</p></div><div>{d.formNote&&<p className='corporate-form-note'>{d.formNote}</p>}{d.form?renderForm(d.form.recordId):<p role='status'>Select a corporate enquiry form to preview it.</p>}</div></>;break;}
 }
 return <section id={section.controls.anchor} className={`${className} cms-mice-section background-${section.controls.background} width-${section.controls.width} spacing-${section.controls.spacing} align-${section.controls.textAlign}`} data-cms-section={section.id}>{body}</section>;
}
