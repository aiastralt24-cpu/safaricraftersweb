import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsLocation} from '@/components/CmsLocation';
import {readPublishedLocation,publicLocationConfig} from '@/lib/cms/public-location-runtime';
import {usesCmsLocation,publishedLocationMetadata} from '@/lib/cms/location-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsLocation())notFound();const value=await readPublishedLocation(slug,publicLocationConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedLocationMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function LocationPage({params}:Props){const location=await load((await params).slug);return <><CmsLocation profile={location}/></>;}
