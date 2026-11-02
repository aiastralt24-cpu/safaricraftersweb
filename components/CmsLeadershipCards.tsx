import type {ReactNode} from 'react';
import type {z} from 'zod';
import type {sectionDataSchemas,SectionImage} from '../lib/cms/composition';
import {CmsHeadingText} from './CmsHeadingText';
import './CmsLeadershipCards.css';
type Data=z.infer<typeof sectionDataSchemas.cards>;
export function CmsLeadershipCards({data,headingLevel,renderImage}:{data:Data;headingLevel:'h1'|'h2'|'h3';renderImage:(image:SectionImage)=>ReactNode}){
 const Heading=headingLevel,Role=Heading==='h1'?'h2':Heading==='h2'?'h3':'h4';
 return <div className='cms-leadership'><div className='cms-leadership-heading'><div>{data.eyebrow&&<p className='eyebrow'>{data.eyebrow}</p>}<Heading className={Heading}><CmsHeadingText title={data.title} accent={data.titleAccent}/></Heading></div>{data.introduction&&<p>{data.introduction}</p>}</div><div className='cms-leadership-profiles'>{data.items.map(item=><article key={item.id}><figure className={`cms-leadership-portrait portrait-${item.portrait?.shape??'tall'}`} style={{'--portrait-position':`${item.portrait?.x??50}% ${item.portrait?.y??50}%`} as React.CSSProperties}>{item.image&&<><div className='cms-leadership-image'>{renderImage(item.image)}</div>{(item.image.caption||item.image.credit)&&<figcaption>{[item.image.caption,item.image.credit].filter(Boolean).join(' · ')}</figcaption>}</>}</figure><div>{item.eyebrow&&<p className='eyebrow'>{item.eyebrow}</p>}<Role>{item.title}</Role>{item.copy.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}{item.link&&<a className='brass-link' href={item.link.href} target={item.link.newWindow?'_blank':undefined} rel={item.link.newWindow?'noopener noreferrer':undefined}>{item.link.label}</a>}</div></article>)}</div></div>;
}
