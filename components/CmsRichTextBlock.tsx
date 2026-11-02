import type {RichText} from '../lib/cms/composition';
import './CmsRichTextBlock.css';
import {CmsInlineText} from './CmsInlineText';
export function CmsRichTextBlock({block,disableLinks=false}:{block:RichText[number];disableLinks?:boolean}){
 switch(block.kind){
 case 'paragraph':return <p><CmsInlineText block={block} disableLinks={disableLinks}/></p>;
 case 'quote':return <blockquote><p>{block.text}</p>{block.attribution&&<p className='cms-quote-attribution'>{block.attribution}</p>}</blockquote>;
 case 'table':return <div role='region' aria-label={block.caption} tabIndex={0} style={{maxWidth:'100%',overflowX:'auto'}}><table className='cms-rich-table'><caption>{block.caption}</caption><thead><tr>{block.headers.map((header,i)=><th key={i} scope='col'>{header}</th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
 case 'link':return <p><a className={block.style==='button'?'button button-solid':undefined} href={block.href}>{block.label}</a></p>;
 case 'list':return block.ordered?<ol>{block.items.map((item,i)=><li key={i}><CmsInlineText block={{kind:'paragraph',text:item,...(block.itemSpans?.[i]?{spans:block.itemSpans[i]!}:{})}} disableLinks={disableLinks}/></li>)}</ol>:<ul>{block.items.map((item,i)=><li key={i}><CmsInlineText block={{kind:'paragraph',text:item,...(block.itemSpans?.[i]?{spans:block.itemSpans[i]!}:{})}} disableLinks={disableLinks}/></li>)}</ul>;
 }
}
