import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsLeadership} from '@/components/CmsLeadership';
import {readPublishedLeadership,publicLeadershipConfig} from '@/lib/cms/public-leadership-runtime';
import {usesCmsLeadership,publishedLeadershipMetadata} from '@/lib/cms/leadership-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsLeadership())notFound();const value=await readPublishedLeadership(slug,publicLeadershipConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedLeadershipMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function LeadershipPage({params}:Props){const leadership=await load((await params).slug);return <><CmsLeadership profile={leadership}/></>;}
