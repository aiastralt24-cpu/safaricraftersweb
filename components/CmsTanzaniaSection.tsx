import {tanzaniaLayoutOverride} from '../lib/cms/tanzania-layout';
import './CmsTanzaniaSection.css';
import type {ReactNode} from 'react';
import type {z} from 'zod';
import {CmsKenyaSection,type KenyaSection} from './CmsKenyaSection';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import {tanzaniaSectionSchemas,type TanzaniaSectionKind} from '../lib/cms/tanzania-country-sections';
import type {SectionImage,Composition} from '../lib/cms/composition';
import './TanzaniaCountryPage.css';
export type TanzaniaPlanner=z.infer<typeof tanzaniaSectionSchemas.tanzaniaPlanner>['planner'];
export type TanzaniaSection = {[K in TanzaniaSectionKind]:{id:string;kind:K;data:z.infer<(typeof tanzaniaSectionSchemas)[K]>;controls:KenyaSection['controls']&Pick<Composition['sections'][number]['controls'],'tanzaniaOverrides'>}}[TanzaniaSectionKind];
/** Rendering only: callers supply private/public media and the appropriate planner action. */
export function CmsTanzaniaSection({section,renderImage,renderGallery,renderPlanner}:{section:TanzaniaSection;renderImage:(image:SectionImage)=>ReactNode;renderGallery:(data:z.infer<typeof tanzaniaSectionSchemas.tanzaniaGallery>)=>ReactNode;renderPlanner:(planner:TanzaniaPlanner,className?:string)=>ReactNode}){
 const H=section.controls.headingLevel,Child=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const common={'data-kenya-background':tanzaniaLayoutOverride(section.controls,'background')?section.controls.background:undefined,'data-kenya-media':tanzaniaLayoutOverride(section.controls,'mediaAlign')?section.controls.mediaAlign:undefined,'data-kenya-mobile':tanzaniaLayoutOverride(section.controls,'mobileOrder')?section.controls.mobileOrder:undefined,id:section.controls.anchor,'data-cms-section':section.id,'data-cms-motion':section.controls.animation??'none','data-kenya-width':section.controls.width??'content','data-kenya-spacing':section.controls.spacing??'standard','data-kenya-align':section.controls.textAlign??'start'};
 switch(section.kind){
 case 'tanzaniaPlaces':{const d=section.data;return <section {...common} className='container kenya-places'><header className='kenya-section-heading'><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></header>{d.items.map(item=><article className='kenya-place' key={item.id}><Child className='kenya-place-title'>{item.title}</Child><div className='kenya-place-body'><figure className='tanzania-place-figure'><div className='kenya-place-image'>{renderImage(item.image)}</div>{item.imageCaption&&<figcaption>{item.imageCaption}</figcaption>}</figure><div className='kenya-place-copy'><span className='kenya-number'>{item.subtitle}</span><p>{item.copy}</p>{renderPlanner(item.planner)}</div></div></article>)}</section>;}
 case 'tanzaniaItineraries':{const d=section.data;return <section {...common} className='container kenya-combinations kenya-space'><header className='kenya-section-heading kenya-bento-heading'><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></header><div className={`itinerary-bento itinerary-bento-${d.items.length}`}>{d.items.map(item=><article className='itinerary-card' key={item.id}>{renderImage(item.image)}<div className='itinerary-shade'/><div className='itinerary-copy'><span className='itinerary-label'>{item.label}</span><Child>{item.title}</Child>{renderPlanner(item.planner,'itinerary-cta')}</div></article>)}</div></section>;}
 case 'tanzaniaPlanner':{const d=section.data;return <section {...common} className='kenya-plan-band'><div className='container kenya-plan kenya-space'><div><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></div><div><p>{d.copy}</p>{renderPlanner(d.planner,'button button-solid')}</div></div></section>;}
 default:return <CmsKenyaSection section={{...section,controls:{...section.controls,kenyaOverrides:section.controls.tanzaniaOverrides},kind:section.kind.replace('tanzania','kenya')} as KenyaSection} renderImage={renderImage} renderGallery={renderGallery}/>;
 }
}
