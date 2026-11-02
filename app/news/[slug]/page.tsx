import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsNews} from '@/components/CmsNews';
import {JsonLd} from '@/components/JsonLd';
import {readPublishedNews,publicNewsConfig} from '@/lib/cms/public-news-runtime';
import {usesCmsNews,publishedNewsMetadata,publishedNewsStructuredData} from '@/lib/cms/news-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {siteUrl} from '@/lib/structured-data';
import '../../article.css';
export const dynamic='force-dynamic';
const load=cache(async(slug:string)=>{if(!usesCmsNews())notFound();const value=await readPublishedNews(slug,publicNewsConfig());if(!value)notFound();return value;});
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return publishedNewsMetadata(await load((await params).slug),await readSeoDefaults());}
export default async function NewsPage({params}:Props){const news=await load((await params).slug);return <><JsonLd data={publishedNewsStructuredData(news,siteUrl)}/><CmsNews news={news}/></>;}
