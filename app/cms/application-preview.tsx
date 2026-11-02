'use client';
import {CmsRichTextBlock} from '../../components/CmsRichTextBlock';
import {CmsInlineText} from '../../components/CmsInlineText';
import {applicationSchema} from '../../lib/cms/applications';
import type {SectionImage} from '../../lib/cms/composition';
import {MediaImage,type LoadMediaPreview} from './media-image';
export function ApplicationPreview({value,loadPreview}:{value:unknown;loadPreview:LoadMediaPreview}){
 const parsed=applicationSchema.safeParse(value);if(!parsed.success)return <p role='alert'>This draft needs repair before previewing.</p>;const d=parsed.data;
 const photo=(image:SectionImage)=><figure><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={loadPreview}/>{(image.caption||image.credit)&&<figcaption>{image.caption}{image.credit&&` · ${image.credit}`}</figcaption>}</figure>;
 return <article aria-label='Application draft preview' className='cms-destination-preview'><p>Draft content preview. Nothing here is published.</p><header><p>{d.kind==='industry'?'Industry':'Application'}</p><h2>{d.title}</h2><p>{d.summary}</p></header>{d.image?photo(d.image):<p>No listing image selected.</p>}{d.body.map(block=><div key={block.id}>{block.kind==='paragraph'?<p className='cms-destination-copy'><CmsInlineText block={block} disableLinks/></p>:block.kind==='table'?<CmsRichTextBlock block={block}/>:block.kind==='heading'?block.level==='h2'?<h2>{block.text}</h2>:<h3>{block.text}</h3>:block.kind==='quote'?<blockquote><p className='cms-destination-copy'>{block.text}</p>{block.attribution&&<cite>{block.attribution}</cite>}</blockquote>:block.kind==='list'?<CmsRichTextBlock block={block} disableLinks/>:block.kind==='image'?photo(block.image):<p>{block.label} <small>Link: {block.href} (disabled in preview)</small></p>}</div>)}<details><summary>Search and sharing overrides</summary><p>SEO title: {d.seo.title||'Inherited or automatic'}</p><p>Description: {d.seo.description||'Inherited or automatic'}</p><p>Canonical: {d.seo.canonical||'Automatic'}</p><p>Indexing: {d.seo.indexing} · Sitemap: {d.seo.sitemap}</p></details></article>;
}
