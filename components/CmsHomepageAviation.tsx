import type {ReactNode} from 'react';
import type {z} from 'zod';
import type {SectionImage,sectionDataSchemas} from '../lib/cms/composition';
import {heroFramingStyle} from '../lib/cms/hero-framing';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHeroFraming.css';
import './CmsHomepageAviation.css';
export type HomepageAviation=z.infer<typeof sectionDataSchemas.homepageAviation>;
export function CmsHomepageAviation({value,headingLevel:H='h2',renderImage}:{value:HomepageAviation;headingLevel?:'h1'|'h2'|'h3';renderImage:(image:SectionImage)=>ReactNode}){
 return <div className='cms-home-aviation'><div>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H><p className='cms-home-aviation-copy'>{value.copy}</p><ul aria-label={value.benefitsLabel}>{value.benefits.map(item=><li key={item.id}>{item.text}</li>)}</ul><a href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label} <span aria-hidden='true'>↗</span></a></div><figure className='cms-hero-framing hero-breakpoint-760' style={heroFramingStyle(value.desktopFraming,value.mobileFraming)}>{renderImage(value.image)}{(value.image.caption||value.image.credit)&&<figcaption>{value.image.caption}{value.image.credit&&<small>{value.image.credit}</small>}</figcaption>}</figure></div>;
}
