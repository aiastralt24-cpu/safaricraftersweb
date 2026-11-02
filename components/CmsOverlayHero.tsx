import type {ReactNode} from 'react';
import type {z} from 'zod';
import type {sectionDataSchemas,SectionImage,Composition} from '../lib/cms/composition';
import {heroFramingStyle} from '../lib/cms/hero-framing';
import {CmsHeadingText} from './CmsHeadingText';
import './CmsOverlayHero.css';
type Hero=z.infer<typeof sectionDataSchemas.hero>;
export function CmsOverlayHero({data,controls,renderImage}:{data:Hero;controls:Composition['sections'][number]['controls'];renderImage:(image:SectionImage)=>ReactNode}){
 const Heading=controls.headingLevel;
 const credit=(image:SectionImage)=>[image.caption,image.credit].filter(Boolean).join(' · ');
 return <div className={`cms-overlay-hero align-${controls.textAlign} spacing-${controls.spacing}`} style={heroFramingStyle(data.desktopFraming,data.mobileFraming)}><div className={`cms-overlay-image ${data.mobile?'overlay-desktop':''}`}>{renderImage(data.desktop)}</div>{data.mobile&&<div className='cms-overlay-image overlay-mobile'>{renderImage(data.mobile)}</div>}<div className='cms-overlay-scrim'/><div className={`cms-overlay-copy width-${controls.width}`}>{data.eyebrow&&<p className='cms-overlay-eyebrow'>{data.eyebrow}</p>}<Heading className={Heading}><CmsHeadingText title={data.title} accent={data.titleAccent}/></Heading><p className='cms-overlay-description'>{data.copy}</p>{data.buttons.length>0&&<div className='cms-overlay-buttons'>{data.buttons.map((button,index)=><a key={index} className='button' href={button.href} target={button.newWindow?'_blank':undefined} rel={button.newWindow?'noopener noreferrer':undefined}>{button.label}</a>)}</div>}</div><div className='cms-overlay-credits'>{credit(data.desktop)&&<p className={data.mobile?'overlay-desktop':undefined}>{credit(data.desktop)}</p>}{data.mobile&&credit(data.mobile)&&<p className='overlay-mobile'>{credit(data.mobile)}</p>}</div></div>;
}
