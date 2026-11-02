import {Fragment} from 'react';
import type {ReactNode} from 'react';
import type {z} from 'zod';
import type {SectionImage,sectionDataSchemas} from '../lib/cms/composition';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageJourneyTypes.css';
export type HomepageJourneyTypes=z.infer<typeof sectionDataSchemas.homepageJourneyTypes>;
export function CmsHomepageJourneyTypes({value,headingLevel:H='h2',renderImage}:{value:HomepageJourneyTypes;headingLevel?:'h1'|'h2'|'h3';renderImage:(image:SectionImage)=>ReactNode}){
 const CardHeading=H==='h1'?'h2':H==='h2'?'h3':'h4';
 return <div className='cms-home-journey-types'><H><CmsEditorialHeading value={value.heading}/></H><div className='cms-home-journey-types-grid'>{value.items.map(item=><article key={item.id}><figure>{renderImage(item.image)}{(item.image.caption||item.image.credit)&&<figcaption>{item.image.caption}{item.image.credit&&<small>{item.image.credit}</small>}</figcaption>}</figure><CardHeading><CmsEditorialHeading value={item.heading}/></CardHeading><p>{item.copy.runs.map((run,index)=>run.strong?<strong key={index}>{run.text}</strong>:<Fragment key={index}>{run.text}</Fragment>)}</p><a href={item.link.href} target={item.link.newWindow?'_blank':undefined} rel={item.link.newWindow?'noopener noreferrer':undefined}>{item.link.label}</a></article>)}</div></div>;
}
