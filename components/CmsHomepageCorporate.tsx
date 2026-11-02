import type {ReactNode,CSSProperties} from 'react';
import type {z} from 'zod';
import type {SectionImage,sectionDataSchemas} from '../lib/cms/composition';
import type {ImageFocalPoint} from '../lib/cms/composition-media';
import {CmsEditorialHeading} from './CmsEditorialHeading';
import './CmsHomepageCorporate.css';
export type HomepageCorporate=z.infer<typeof sectionDataSchemas.homepageCorporate>;
export function CmsHomepageCorporate({value,headingLevel:H='h2',renderImage}:{value:HomepageCorporate;headingLevel?:'h1'|'h2'|'h3';renderImage:(image:SectionImage)=>ReactNode}){
 const ItemHeading=H==='h1'?'h2':H==='h2'?'h3':'h4';
 const picture=(image:SectionImage,className:string,desktop?:ImageFocalPoint,mobile?:ImageFocalPoint)=>{const d=desktop??{x:50,y:50},m=mobile??d;return <figure className={className} style={{'--corporate-position':`${d.x}% ${d.y}%`,'--corporate-mobile-position':`${m.x}% ${m.y}%`} as CSSProperties}>{renderImage(image)}{(image.caption||image.credit)&&<figcaption>{image.caption}{image.credit&&<small>{image.credit}</small>}</figcaption>}</figure>;};
 return <div className='cms-home-corporate'><div className='cms-home-corporate-copy'>{value.eyebrow&&<p className='eyebrow'>{value.eyebrow}</p>}<H><CmsEditorialHeading value={value.heading}/></H>{value.paragraphs.map(paragraph=><p key={paragraph.id} className='cms-home-corporate-paragraph'>{paragraph.text}</p>)}<div className='cms-home-corporate-formats'>{value.formats.map(item=><a href={item.href} key={item.id}><div><small>{item.label}</small><ItemHeading>{item.title}</ItemHeading></div><span aria-hidden='true'>↗</span></a>)}</div><a className='cms-home-corporate-cta' href={value.button.href} target={value.button.newWindow?'_blank':undefined} rel={value.button.newWindow?'noopener noreferrer':undefined}>{value.button.label} <span aria-hidden='true'>↗</span></a></div><div className='cms-home-corporate-images'>{picture(value.mainImage,'cms-home-corporate-main',value.mainFocalPoint,value.mainMobileFocalPoint)}{picture(value.insetImage,'cms-home-corporate-inset',value.insetFocalPoint,value.insetMobileFocalPoint)}</div></div>;
}
