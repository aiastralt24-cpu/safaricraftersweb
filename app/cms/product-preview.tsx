'use client';
import {useEffect,useRef,useState} from 'react';
import {productSchema} from '../../lib/cms/products';
import {productPreview,type ProductPreviewSpecification} from '../../lib/cms/product-preview';
import {verifiedProductCategoryRevision,type ProductCategoryRevision} from '../../lib/cms/product-category-revision';
import {CmsRichTextBlock} from '../../components/CmsRichTextBlock';
import {CmsInlineText} from '../../components/CmsInlineText';
import type {JournalBlock} from '../../lib/cms/journal';
import type {SectionImage} from '../../lib/cms/composition';
import {MediaImage,type LoadMediaPreview} from './media-image';
function Specs({rows}:{rows:ProductPreviewSpecification[]}){return <dl>{rows.map((row,i)=><div key={i}><dt>{row.label}{row.unit?` (${row.unit})`:''} · {row.region}</dt><dd>{row.display}{row.inherited?' · Inherited from product':''}{row.unresolved?' · Review category definitions':''}</dd></div>)}</dl>;}
export function ProductPreview({value,site,locale,api,loadPreview}:{value:unknown;site:string;locale:string;api:(path:string)=>Promise<any>;loadPreview:LoadMediaPreview}){
 const parsed=productSchema.safeParse(value),pins=JSON.stringify(parsed.success?[parsed.data.category,parsed.data.subcategory]:[]);
 const [categories,setCategories]=useState<ProductCategoryRevision[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>{let active=true;setCategories([]);setLoading(true);setError('');const selected=JSON.parse(pins).filter(Boolean) as {recordId:string;revisionId:string}[];
 void Promise.all(selected.map(async pin=>{const query={site,record:pin.recordId,revision:pin.revisionId};const response=await apiRef.current('/api/cms/product-categories/revision?'+new URLSearchParams(query));const c=verifiedProductCategoryRevision(response.category,query);if(c.locale!==locale)throw Error('Category language mismatch.');return c;})).then(rows=>{if(active)setCategories(rows);}).catch(()=>{if(active)setError('Category definitions are unavailable. Content and saved values are retained; their labels cannot be verified.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[pins,site,locale,attempt]);
 if(!parsed.success)return <p role='alert'>Repair the invalid draft fields before previewing.</p>;
 let d:ReturnType<typeof productPreview>;try{d=productPreview(parsed.data,categories,{site,locale});}catch{return <p role='alert'>The category definitions do not match this draft. Return to the editor and refresh the saved definitions.</p>;}
 const photo=(image:SectionImage)=><figure><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={loadPreview}/>{(image.caption||image.credit)&&<figcaption>{image.caption}{image.credit&&` · ${image.credit}`}</figcaption>}</figure>;
 const body=(blocks:JournalBlock[])=>blocks.map(block=><div key={block.id}>{block.kind==='paragraph'?<p className='cms-destination-copy'><CmsInlineText block={block} disableLinks/></p>:block.kind==='table'||block.kind==='list'?<CmsRichTextBlock block={block} disableLinks/>:block.kind==='heading'?block.level==='h2'?<h2>{block.text}</h2>:<h3>{block.text}</h3>:block.kind==='quote'?<blockquote><p>{block.text}</p><cite>{block.attribution}</cite></blockquote>:block.kind==='image'?photo(block.image):<p>{block.label} <small>{block.href} · Link disabled in preview</small></p>}</div>);
 return <article aria-label='Product draft preview' className='cms-destination-preview'><p>Private draft content preview. Nothing is published. This does not verify claims, stock or purchase availability.</p><h2>{d.title}</h2><p>{d.brand} · {d.code}</p><p>{d.summary}</p><p>{d.lifecycle} · {d.lifecycleNote}</p>{d.categories.map((c,i)=><p key={i}>{c.title}{c.newerRevisionAvailable?' · Preview uses the saved definitions; a newer revision is available.':''}</p>)}
 {loading&&<p role='status'>Loading saved category definitions…</p>}{error&&<aside role='alert'><p>{error}</p><button type='button' onClick={()=>setAttempt(v=>v+1)}>Retry preview definitions</button></aside>}
 {!loading&&<section><h3>Specifications</h3><Specs rows={d.specifications}/></section>}
 {body(d.body)}{d.gallery.map((image,i)=><div key={i}>{photo(image)}</div>)}
 {(['benefits','features','suitableUses','unsuitableUses','colours','finishes'] as const).map(field=>d[field].length>0&&<section key={field}><h3>{({benefits:'Benefits',features:'Features',suitableUses:'Suitable uses',unsuitableUses:'Unsuitable uses',colours:'Colours',finishes:'Finishes'})[field]}</h3><ul>{d[field].map((v,i)=><li key={i}>{v}</li>)}</ul></section>)}{d.packaging&&<p>Packaging: {d.packaging}</p>}
 {(['installation','precautions','warranty'] as const).map(field=>d[field].length>0&&<section key={field}><h3>{({installation:'Installation',precautions:'Precautions',warranty:'Warranty'})[field]}</h3>{body(d[field])}</section>)}
 {d.variants.map((v,i)=><section key={i}><h3>{v.title}</h3><p>{[v.code,v.size,v.colour,v.finish,v.packaging].filter(Boolean).join(' · ')}</p>{!loading&&<Specs rows={v.specifications}/>}</section>)}
 {d.availability.length>0&&<section><h3>Availability scope</h3><ul>{d.availability.map((r,i)=><li key={i}>{r.countryCode}: {r.region||'Whole country'}</li>)}</ul></section>}
 {d.videos.map((v,i)=><section key={i}><h3>{v.title}</h3><p>Video destination: {v.url} · Playback disabled in preview</p><p className='cms-destination-copy'>{v.transcript}</p></section>)}
 {d.enquiry&&<section><button disabled>{d.enquiry.label}</button><p>{d.enquiry.href} · Navigation disabled in preview</p></section>}
 {d.relatedCounts.length>0&&<aside><h3>Related content selected</h3><p>Related visitor cards require publication checks and are not rendered here.</p><ul>{d.relatedCounts.map(v=><li key={v.kind}>{v.kind}: {v.count}</li>)}</ul></aside>}
 <details><summary>Search overrides</summary><p>{d.seo.title||'Automatic title'}</p><p>{d.seo.description||'Automatic description'}</p><p>{d.seo.canonical||'Automatic canonical'}</p><p>Indexing: {d.seo.indexing} · Sitemap: {d.seo.sitemap}</p></details>
 </article>;
}
