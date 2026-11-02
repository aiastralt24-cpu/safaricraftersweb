import {CmsProductIndex} from '@/components/CmsProductIndex';
import {usesCmsProduct} from '@/lib/cms/public-product-runtime';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsProductCategory} from '@/components/CmsProductCategory';
import {readPublishedProductCategory,publicProductCategoryConfig} from '@/lib/cms/public-product-category-runtime';
import {usesCmsProductCategory,publishedProductCategoryMetadata} from '@/lib/cms/product-category-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsProductCategory())notFound();const value=await readPublishedProductCategory(slug,publicProductCategoryConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedProductCategoryMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function ProductCategoryPage({params}:Props){const category=await load((await params).slug);return <><CmsProductCategory profile={category}>{usesCmsProduct()&&<CmsProductIndex category={category.recordId} embedded/>}</CmsProductCategory></>;}
