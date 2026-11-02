import {CmsProductFaqs} from './CmsProductFaqs';
import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedProduct} from '@/lib/cms/published-product';
import type {JournalBlock} from '@/lib/cms/journal';
import type {SectionImage} from '@/lib/cms/composition';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
function Photo({image}:{image:SectionImage}){return <figure><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading='lazy' style={{maxWidth:'100%',height:'auto'}}/>{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;}
function Body({blocks}:{blocks:JournalBlock[]}){return blocks.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<Photo image={block.image}/>:<CmsRichTextBlock block={block}/>}</div>);}
function Specs({rows}:{rows:PublishedProduct['content']['specifications']}){return <dl>{rows.map((row,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:'1rem',paddingBlock:'.75rem',borderBottom:'1px solid #ddd',overflowWrap:'anywhere'}}><dt>{row.label}{row.unit?` (${row.unit})`:''}{row.region!=='global'&&<small style={{display:'block'}}>{row.region}</small>}</dt><dd style={{margin:0}}>{row.display}{row.inherited&&<small style={{display:'block'}}>Inherited from product</small>}</dd></div>)}</dl>;}
const relatedLabels={applications:'Applications',documents:'Documents',projects:'Projects',certifications:'Certifications',relatedProducts:'Related products',accessories:'Accessories',compatibleSystems:'Compatible systems',replacements:'Replacements'} as const;
export function CmsProduct({profile}:{profile:PublishedProduct}){
 const d=profile.content;
 return <article className='article cms-public-product'>
 <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}><Breadcrumbs items={[{label:'Home',href:'/'},{label:'Products',href:'/products'},...profile.categories.map(c=>({label:c.title,href:c.href})),{label:d.seo.breadcrumbLabel||d.title}]}/><p className='eyebrow'>{d.brand||'Product'}</p><h1 className='display'>{d.title}</h1><p>Product code: {d.code}</p></header>
 <div className='article-body'><p className='intro'>{d.summary}</p>{(d.lifecycle!=='active'||d.lifecycleNote)&&<aside aria-label='Product lifecycle'><h2 className='h2'>{{active:'Active product',comingSoon:'Coming soon',discontinued:'Discontinued'}[d.lifecycle]}</h2>{d.lifecycleNote&&<p>{d.lifecycleNote}</p>}</aside>}
 <Body blocks={d.body}/>{d.gallery.map((image,i)=><Photo key={i} image={image}/>)}
 {(['benefits','features','suitableUses','unsuitableUses','colours','finishes'] as const).map(field=>d[field].length>0&&<section key={field}><h2 className='h2'>{({benefits:'Benefits',features:'Features',suitableUses:'Suitable uses',unsuitableUses:'Unsuitable uses',colours:'Colours',finishes:'Finishes'})[field]}</h2><ul>{d[field].map((v,i)=><li key={i}>{v}</li>)}</ul></section>)}{d.packaging&&<section><h2 className='h2'>Packaging</h2><p>{d.packaging}</p></section>}
 {d.specifications.length>0&&<section aria-label='Product specifications'><h2 className='h2'>Specifications</h2><Specs rows={d.specifications}/></section>}
 {d.variants.length>0&&<section aria-label='Product variants'><h2 className='h2'>Variants</h2>{d.variants.map((v,i)=><section key={i}><h3 className='h3'>{v.title}</h3><p>{[v.code,v.size,v.colour,v.finish,v.packaging].filter(Boolean).join(' · ')}</p><Specs rows={v.specifications}/></section>)}</section>}
 {(['installation','precautions','warranty'] as const).map(field=>d[field].length>0&&<section key={field}><h2 className='h2'>{({installation:'Installation',precautions:'Precautions',warranty:'Warranty'})[field]}</h2><Body blocks={d[field]}/></section>)}
 {d.availability.length>0&&<section><h2 className='h2'>Availability scope</h2><ul>{d.availability.map((r,i)=><li key={i}>{r.countryCode}: {r.region||'Whole country'}</li>)}</ul></section>}
 {Object.entries(relatedLabels).map(([group,label])=>{const cards=profile.related.filter(c=>c.group===group);return cards.length>0&&<section key={group} aria-label={label}><h2 className='h2'>{label}</h2><ul>{cards.map(c=><li key={c.href}><a href={c.href}>{c.title}</a></li>)}</ul></section>;})}
 {profile.faqs.length>0&&<CmsProductFaqs items={profile.faqs}/>}
 {d.enquiry&&<p><a className='button button-solid' href={d.enquiry.href}>{d.enquiry.label}</a></p>}<p><a href='/products'>All products</a></p></div></article>;
}
