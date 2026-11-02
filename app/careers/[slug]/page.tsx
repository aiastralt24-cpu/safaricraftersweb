import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsCareer} from '@/components/CmsCareer';
import {readPublishedCareer,publicCareerConfig} from '@/lib/cms/public-career-runtime';
import {usesCmsCareer,publishedCareerMetadata} from '@/lib/cms/career-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsCareer())notFound();const value=await readPublishedCareer(slug,publicCareerConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedCareerMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function CareerPage({params}:Props){const career=await load((await params).slug);return <><CmsCareer profile={career}/></>;}
