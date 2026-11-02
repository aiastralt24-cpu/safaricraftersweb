import type {z} from 'zod';
import type {sectionDataSchemas} from '../lib/cms/composition';
import {CmsHeadingText} from './CmsHeadingText';
import './CmsNumberedCards.css';
type Data=z.infer<typeof sectionDataSchemas.cards>;
export function CmsNumberedCards({data,headingLevel}:{data:Data;headingLevel:'h1'|'h2'|'h3'}){
 const Heading=headingLevel,ItemHeading=Heading==='h1'?'h2':Heading==='h2'?'h3':'h4';
 return <div className='cms-numbered-cards'><div className='cms-numbered-heading'>{data.eyebrow&&<p className='eyebrow'>{data.eyebrow}</p>}<Heading className={Heading}><CmsHeadingText title={data.title} accent={data.titleAccent}/></Heading>{data.introduction&&<p>{data.introduction}</p>}</div><div className='cms-numbered-items'>{data.items.map((item,index)=><article key={item.id}><span aria-hidden='true'>{String(index+1).padStart(2,'0')}</span><div>{item.eyebrow&&<p className='eyebrow'>{item.eyebrow}</p>}<ItemHeading>{item.title}</ItemHeading><p>{item.copy}</p>{item.link&&<a className='brass-link' href={item.link.href} target={item.link.newWindow?'_blank':undefined} rel={item.link.newWindow?'noopener noreferrer':undefined}>{item.link.label}</a>}</div></article>)}</div></div>;
}
