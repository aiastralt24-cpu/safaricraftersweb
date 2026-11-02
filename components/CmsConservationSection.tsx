import type {ReactNode} from 'react';
import type {ConservationPageSection} from '../lib/cms/conservation-page';
import type {SectionImage} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsConservationSection.css';

/** Shared semantic content; caller owns visibility, outer presentation and media authorization. */
export function CmsConservationSection({section,renderImage}:{section:ConservationPageSection;renderImage:(image:SectionImage)=>ReactNode}){
 const H=section.controls.headingLevel,Child=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const data=section.data;
 const heading=<H className='cms-conservation-heading'><CmsEditorialHeading value={data.heading}/></H>;
 const picture=(image:SectionImage)=><figure>{renderImage(image)}{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
 return <div className={`cms-conservation-content kind-${section.kind}`}>
 {section.kind==='conservationHero'?<><p className='eyebrow'>{section.data.eyebrow}</p>{heading}<p>{section.data.copy}</p>{picture(section.data.image)}<p className='cms-conservation-credit'>{section.data.credit}</p></>:
 section.kind==='conservationIntro'?<><p className='eyebrow'>{section.data.label}</p>{heading}<div className='cms-conservation-paragraphs'>{section.data.paragraphs.map((copy,index)=><p key={index}>{copy}</p>)}</div></>:
 section.kind==='conservationImpact'?<><p className='eyebrow'>{section.data.eyebrow}</p>{heading}<p>{section.data.copy}</p><a href={section.data.source.href} target={section.data.source.newWindow?'_blank':undefined} rel={section.data.source.newWindow?'noopener noreferrer':undefined}>{section.data.source.label}</a>{(['primary','secondary'] as const).map(tier=><dl key={tier} className={`cms-conservation-outcomes tier-${tier}`} aria-label={tier==='primary'?section.data.primaryLabel:section.data.secondaryLabel}>{section.data.metrics.filter(item=>item.tier===tier).map(item=><div key={item.id}><dt>{item.value}</dt><dd>{item.label}</dd></div>)}</dl>)}</>:
 section.kind==='conservationRecords'?<><p className='eyebrow'>{section.data.eyebrow}</p>{heading}<p>{section.data.copy}</p><div className={`cms-conservation-projects media-${section.controls.mediaAlign} mobile-${section.controls.mobileOrder}`}>{section.data.items.map(item=><article key={item.id}>{picture(item.image)}<div><p className='eyebrow'>{item.place}</p><Child>{item.title}</Child><p>{item.copy}</p></div></article>)}</div></>:
 <><p className='eyebrow'>{section.data.eyebrow}</p>{heading}<div className='cms-conservation-regions'>{section.data.regions.map(item=><div key={item.id}><Child>{item.title}</Child><p>{item.copy}</p></div>)}</div><div className='cms-conservation-species'><Child>{section.data.species.label}</Child><p>{section.data.species.copy}</p></div></>}
 </div>;
}
