import {notFound} from 'next/navigation';
import {CmsProductCategoryIndex} from '@/components/CmsProductCategoryIndex';
import {usesCmsProductCategory} from '@/lib/cms/product-category-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsProductCategory())notFound();const defaults=await readSeoDefaults();return {title:'Product categories',description:'Explore our product categories.',alternates:{canonical:'/product-categories'},robots:{index:defaults?.indexing!=='noindex'}};}
export default function Page(){if(!usesCmsProductCategory())notFound();return <CmsProductCategoryIndex/>;}
