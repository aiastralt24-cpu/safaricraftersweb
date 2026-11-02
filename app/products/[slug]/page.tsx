import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsProduct} from '@/components/CmsProduct';
import {readPublishedProduct,publicProductConfig} from '@/lib/cms/public-product-runtime';
import {usesCmsProduct,publishedProductMetadata} from '@/lib/cms/product-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsProduct())notFound();const value=await readPublishedProduct(slug,publicProductConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedProductMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function ProductPage({params}:Props){const product=await load((await params).slug);return <><CmsProduct profile={product}/></>;}
