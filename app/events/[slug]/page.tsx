import {cache} from 'react';
import {notFound} from 'next/navigation';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/lib/structured-data';
import {CmsEvent} from '@/components/CmsEvent';
import {readPublishedEvent,publicEventConfig} from '@/lib/cms/public-event-runtime';
import {publishedEventMetadata,publishedEventStructuredData} from '@/lib/cms/event-route';
import {usesCmsEvents} from '@/lib/cms/public-event-runtime';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsEvents())notFound();const value=await readPublishedEvent(slug,publicEventConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedEventMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function EventPage({params}:Props){const event=await load((await params).slug);return <><JsonLd data={publishedEventStructuredData(event,siteUrl)}/><CmsEvent event={event}/></>;}
