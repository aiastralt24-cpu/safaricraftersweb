import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsPartner} from '@/components/CmsPartner';
import {readPublishedPartner,publicPartnerConfig} from '@/lib/cms/public-partner-runtime';
import {usesCmsPartner,publishedPartnerMetadata} from '@/lib/cms/partner-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsPartner())notFound();const value=await readPublishedPartner(slug,publicPartnerConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedPartnerMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function PartnerPage({params}:Props){const partner=await load((await params).slug);return <><CmsPartner profile={partner}/></>;}
