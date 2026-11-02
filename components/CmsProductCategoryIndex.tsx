import {readPublishedProductCategoryList,publicProductCategoryConfig} from '@/lib/cms/public-product-category-runtime';
export async function CmsProductCategoryIndex(){
 const items=await readPublishedProductCategoryList(publicProductCategoryConfig());
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>Product categories</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}>{item.parent&&<p className='eyebrow'>{item.parent.title}</p>}<h2 className='h3'><a href={item.path}>{item.title}</a></h2><p>{item.summary}</p></article>)}</div>:<p>No product categories have been published yet.</p>}</main>;
}
