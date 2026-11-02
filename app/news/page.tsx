import {notFound} from 'next/navigation';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {usesCmsNews} from '@/lib/cms/news-route';
import {publicNewsConfig,readPublishedNewsList} from '@/lib/cms/public-news-runtime';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsNews())notFound();const defaults=await readSeoDefaults();return {title:'News and press releases',description:'Latest news and press releases.',alternates:{canonical:'/news'},robots:{index:defaults?.indexing!=='noindex'}};}
export default async function NewsPage(){
 if(!usesCmsNews())notFound();const items=await readPublishedNewsList(publicNewsConfig());
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>News and press releases</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}><a href={item.path}>{item.image&&<img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover'}}/>}<h2 className='h3'>{item.title}</h2></a><p>{item.kind==='pressRelease'?'Press release':'News'} · {item.topic} · <time dateTime={item.date}>{item.date}</time></p><p>{item.summary}</p></article>)}</div>:<p>No news has been published yet.</p>}</main>;
}
