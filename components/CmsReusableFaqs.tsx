import type {PublicFaq} from '../lib/cms/public-faq';
import {CmsRichTextBlock} from './CmsRichTextBlock';
export function CmsReusableFaqs({title,answers,headingLevel:Heading='h2'}:{title:string;answers:PublicFaq[];headingLevel?:'h2'|'h3'|'h4'}){
 if(!answers.length)return null;
 return <section className='cms-reusable-faqs'><Heading>{title}</Heading>{answers.map(answer=><details key={answer.recordId}><summary>{answer.question}</summary><div>{answer.answer.map((block,index)=><CmsRichTextBlock key={index} block={block}/>)}</div></details>)}</section>;
}
