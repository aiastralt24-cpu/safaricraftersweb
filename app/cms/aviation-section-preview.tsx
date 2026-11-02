'use client';
import type {CSSProperties} from 'react';
import type {z} from 'zod';
import {aviationSectionSchemas,type AviationSectionKind} from '../../lib/cms/private-aviation-content';
import {CmsEditorialHeading} from '../../components/CmsEditorialHeading';
import {heroFramingStyle} from '../../lib/cms/hero-framing';
import {MediaImage,type LoadMediaPreview} from './media-image';
import {MediaVideo} from './media-video';
import '../../components/CmsHeroFraming.css';
import './aviation-section-preview.css';
type Media=z.infer<typeof aviationSectionSchemas.aviationJourney>['media'];
type Hero=z.infer<typeof aviationSectionSchemas.aviationHero>;
function Action({value}:{value:Hero['button']}){return <a href={value.href} target={value.newWindow?'_blank':undefined} rel={value.newWindow?'noopener noreferrer':undefined}>{value.label}</a>;}
function Picture({value,load}:{value:Media;load:LoadMediaPreview}){
 const render=(image:Media['image'])=><figure className='cms-hero-framing hero-breakpoint-760' style={heroFramingStyle(value.desktopFraming,value.mobileFraming)}><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={load}/>{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
 return <><div className={value.mobileImage?'cms-preview-desktop-image':undefined}>{render(value.image)}</div>{value.mobileImage&&<div className='cms-preview-mobile-image'>{render(value.mobileImage)}</div>}</>;
}
function HeroMedia({value,load,loadVideo}:{value:Hero;load:LoadMediaPreview;loadVideo?:LoadMediaPreview}){
 const d=value.media,ratios={panorama:'1920 / 745',landscape:'4 / 3',wide:'16 / 9',square:'1 / 1',portrait:'3 / 4'},style={'--hero-ratio':ratios[d.desktopFraming.shape],'--hero-mobile-ratio':ratios[d.mobileFraming.shape],'--hero-position':`${d.desktopFraming.x}% ${d.desktopFraming.y}%`,'--hero-mobile-position':`${d.mobileFraming.x}% ${d.mobileFraming.y}%`} as CSSProperties;
 const poster=(image:Hero['media']['poster'])=><figure className='cms-hero-framing hero-breakpoint-760' style={style}><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={load}/>{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
 return <div className='cms-aviation-hero-preview'><div className={d.mobilePoster?'cms-preview-desktop-image':undefined}>{poster(d.poster)}</div>{d.mobilePoster&&<div className='cms-preview-mobile-image'>{poster(d.mobilePoster)}</div>}<p>{value.captions.primary}<span className={value.captions.showSecondaryOnMobile?undefined:'cms-aviation-secondary-caption'}> · {value.captions.secondary}</span></p>{d.background.kind==='video'&&<><p role='note'>Poster shown above. Play the private video below to review it; this preview does not autoplay.</p>{loadVideo?<><div className={d.background.mobileAssetId?'cms-preview-desktop-image':undefined}><MediaVideo asset={d.background.desktopAssetId} label='Desktop aviation video' load={loadVideo}/></div>{d.background.mobileAssetId&&<div className='cms-preview-mobile-image'><MediaVideo asset={d.background.mobileAssetId} label='Mobile aviation video' load={loadVideo}/></div>}</>:<p role='status'>Private video preview is unavailable. The poster remains visible.</p>}</>}</div>;
}
export function AviationSectionPreview({kind,value,headingLevel,load,loadVideo}:{kind:AviationSectionKind;value:unknown;headingLevel:'h1'|'h2'|'h3';load:LoadMediaPreview;loadVideo?:LoadMediaPreview}){
 const H=headingLevel,ItemH=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const title=(d:{eyebrow:string;heading:Hero['heading']})=><><p className='eyebrow'>{d.eyebrow}</p><H><CmsEditorialHeading value={d.heading}/></H></>;
 const steps=(items:{id:string;title:string;copy:string}[],label?:string)=><ol aria-label={label}>{items.map(item=><li key={item.id}><ItemH>{item.title}</ItemH><p style={{whiteSpace:'pre-wrap'}}>{item.copy}</p></li>)}</ol>;
 if(kind==='aviationHero'){const d=aviationSectionSchemas.aviationHero.parse(value);return <>{title(d)}<p style={{whiteSpace:'pre-wrap'}}>{d.copy}</p><Action value={d.button}/><HeroMedia value={d} load={load} loadVideo={loadVideo}/></>;}
 if(kind==='aviationIntroduction'){const d=aviationSectionSchemas.aviationIntroduction.parse(value);return <>{title(d)}{d.paragraphs.map(p=><p key={p.id} style={{whiteSpace:'pre-wrap'}}>{p.text}</p>)}<Action value={d.button}/>{steps(d.steps,d.sequenceLabel)}</>;}
 if(kind==='aviationFleet'){const d=aviationSectionSchemas.aviationFleet.parse(value);return <>{title(d)}<p>{d.introduction}</p><div className='cms-preview-cards'>{d.aircraft.map(aircraft=><article key={aircraft.id}><Picture value={aircraft.media} load={load}/><p>{aircraft.type}</p><ItemH>{aircraft.name}</ItemH><p>{aircraft.summary}</p><dl>{aircraft.specifications.map(spec=><div key={spec.id}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></article>)}</div><p style={{whiteSpace:'pre-wrap'}}>{d.sourceNote}</p></>;}
 if(kind==='aviationJourney'){const d=aviationSectionSchemas.aviationJourney.parse(value);return <>{title(d)}<Picture value={d.media} load={load}/>{steps(d.steps)}</>;}
 const d=aviationSectionSchemas.aviationServices.parse(value);return <>{title(d)}<p>{d.introduction}</p>{steps(d.items)}</>;
}
