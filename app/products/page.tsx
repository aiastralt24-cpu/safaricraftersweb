import {comparisonSlugs} from '@/lib/cms/product-comparison';
import {CmsProductComparison} from '@/components/CmsProductComparison';
import {readPublishedProduct,publicProductConfig} from '@/lib/cms/public-product-runtime';
import {notFound} from 'next/navigation';
import {CmsProductIndex} from '@/components/CmsProductIndex';
import {usesCmsProduct} from '@/lib/cms/product-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
type Props={searchParams:Promise<{compare?:string|string[]}>};
export async function generateMetadata({searchParams}:Props){if(!usesCmsProduct())notFound();const defaults=await readSeoDefaults();return {title:'Products',description:'Explore our products.',alternates:{canonical:'/products'},robots:{index:(await searchParams).compare===undefined&&defaults?.indexing!=='noindex'}};}
export default async function Page({searchParams}:Props){
 if(!usesCmsProduct())notFound();
 const {compare}=await searchParams;
 if(compare===undefined)return <CmsProductIndex/>;
 const slugs=comparisonSlugs(compare);
 if(!slugs)return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1>Choose two to four different products</h1><p><a href='/products'>Return to product selection</a></p></main>;
 const config=publicProductConfig(),products=await Promise.all(slugs.map(slug=>readPublishedProduct(slug,config)));
 if(products.some(product=>product===null))return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1>A selected product is unavailable</h1><p>The selection may have changed since it was published. <a href='/products'>Choose available products</a>.</p></main>;
 return <CmsProductComparison products={products.filter(product=>product!==null)}/>;
}
