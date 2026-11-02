import {CmsRichTextBlock} from './CmsRichTextBlock';
import {CmsDocumentDownloads} from './CmsDocumentDownloads';
import {CmsTextSection} from './CmsTextSection';
import {CmsOverlayHero} from './CmsOverlayHero';
import {CmsHeadingText} from './CmsHeadingText';
import {heroFramingStyle} from '../lib/cms/hero-framing';
import './CmsHeroFraming.css';
import {CmsInlineText} from './CmsInlineText';
import Link from 'next/link';
import type {PublishedSpecialistPage} from '@/lib/cms/specialist-page';
import type {PublishedSpecialist} from '@/lib/cms/public-specialists';
import type {RichText,SectionLink} from '@/lib/cms/composition';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
import {publishedSpecialistStructuredData} from '@/lib/cms/specialist-structured-data';
import {JsonLd} from './JsonLd';
import {CmsSpecialists} from './CmsSpecialists';
import './CmsSpecialistPage.css';

function Buttons({links}:{links:SectionLink[]}){return <div className='cms-specialist-page-buttons'>{links.map((link,index)=><Link key={index} className='button' href={link.href} target={link.newWindow?'_blank':undefined} rel={link.newWindow?'noopener noreferrer':undefined}>{link.label}</Link>)}</div>;}
function Body({blocks}:{blocks:RichText}){return <>{blocks.map((block,index)=><CmsRichTextBlock key={index} block={block}/>)}</>;}
export function CmsSpecialistPage({page,profiles,origin}:{page:PublishedSpecialistPage;profiles:PublishedSpecialist[];origin:string}){
 const hasDirectory=page.sections.some(section=>section.kind==='specialistDirectory');
 return <div className='cms-specialist-page'>{hasDirectory&&profiles.map(profile=>{const data=publishedSpecialistStructuredData(profile,origin);return data?<JsonLd key={profile.recordId} data={data}/>:null;})}{page.sections.map(section=>{
  const c=section.controls,d=section.data,Heading=c.headingLevel;
  if(section.kind==='hero'&&section.data.layout==='overlay')return <section key={section.id} id={c.anchor} className='cms-overlay-section'><CmsOverlayHero data={section.data} controls={c} renderImage={image=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading='eager' fetchPriority='high'/>}/></section>;return <section key={section.id} id={c.anchor} className={`cms-specialist-page-section background-${c.background} spacing-${c.spacing} align-${c.textAlign}`}>
   <div className={`cms-specialist-page-width width-${c.width}`}>
    {section.kind==='hero'?<div className={`cms-specialist-page-hero media-${c.mediaAlign} mobile-${c.mobileOrder}`}>
     <div>{section.data.eyebrow&&<p className='eyebrow'>{section.data.eyebrow}</p>}<Heading className={Heading}><CmsHeadingText title={section.data.title} accent={section.data.titleAccent}/></Heading><p className='intro'>{section.data.copy}</p><Buttons links={section.data.buttons}/></div>
     <figure className="cms-hero-framing hero-breakpoint-860" style={heroFramingStyle(section.data.desktopFraming,section.data.mobileFraming)}><img className={section.data.mobile?'desktop-image':undefined} src={publishedMediaUrl(section.data.desktop.assetId)} alt={section.data.desktop.decorative?'':section.data.desktop.alt} fetchPriority='high'/>{section.data.mobile&&<img className='mobile-image' src={publishedMediaUrl(section.data.mobile.assetId)} alt={section.data.mobile.decorative?'':section.data.mobile.alt} loading='lazy'/>}
      {(section.data.desktop.caption||section.data.desktop.credit)&&<figcaption className={section.data.mobile?'desktop-caption':undefined}>{[section.data.desktop.caption,section.data.desktop.credit].filter(Boolean).join(' · ')}</figcaption>}
      {section.data.mobile&&(section.data.mobile.caption||section.data.mobile.credit)&&<figcaption className='mobile-caption'>{[section.data.mobile.caption,section.data.mobile.credit].filter(Boolean).join(' · ')}</figcaption>}
     </figure>
    </div>:<>{section.kind!=='text'&&'eyebrow' in d&&d.eyebrow&&<p className="eyebrow">{d.eyebrow}</p>}{section.kind!=='text'&&section.kind!=='downloads'&&d.title&&<Heading className={Heading}><CmsHeadingText title={d.title} accent={'titleAccent' in d?d.titleAccent:undefined}/></Heading>}{section.kind==='downloads'?<CmsDocumentDownloads data={section.data} headingLevel={Heading}/>:section.kind==='text'?<CmsTextSection data={section.data} headingLevel={Heading}/>:section.kind==='cta'?<><p>{section.data.copy}</p><Buttons links={section.data.buttons}/></>:section.kind==='specialistDirectory'?<CmsSpecialists embedded profiles={profiles} relatedHeading={section.data.relatedHeading} emptyMessage={section.data.emptyMessage} headingLevel={Heading==='h1'?'h2':Heading==='h2'?'h3':'h4'}/>:null}</>}
   </div>
  </section>;
 })}</div>;
}
