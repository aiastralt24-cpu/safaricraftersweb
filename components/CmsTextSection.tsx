import type {z} from 'zod';
import type {sectionDataSchemas} from '../lib/cms/composition';
import {CmsHeadingText} from './CmsHeadingText';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import './CmsTextSection.css';
export function CmsTextSection({data,headingLevel}:{data:z.infer<typeof sectionDataSchemas.text>;headingLevel:'h1'|'h2'|'h3'}){
 const Heading=headingLevel;
 return <div className={`cms-text-section text-${data.layout??'stacked'}`}><div className='cms-text-heading'>{data.eyebrow&&<p className='eyebrow'>{data.eyebrow}</p>}{data.title&&<Heading className={Heading}><CmsHeadingText title={data.title} accent={data.titleAccent}/></Heading>}</div><div className='cms-text-body'>{data.body.map((block,index)=><CmsRichTextBlock key={index} block={block}/>)}</div></div>;
}
