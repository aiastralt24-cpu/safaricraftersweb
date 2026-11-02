import {notFound} from 'next/navigation';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {usesCmsEvents} from '@/lib/cms/public-event-runtime';
import {publicEventConfig,readPublishedEventList} from '@/lib/cms/public-event-runtime';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsEvents())notFound();const defaults=await readSeoDefaults();return {title:'Events',description:'Published events and event information.',alternates:{canonical:'/events'},robots:{index:defaults?.indexing!=='noindex'}};}
export default async function EventPage(){
 if(!usesCmsEvents())notFound();const items=await readPublishedEventList(publicEventConfig());
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>Events</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}><a href={item.path}>{item.image&&<img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover'}}/>}<h2 className='h3'>{item.title}</h2></a><p>{item.category} · {item.status} · <time dateTime={item.timing.start}>{item.timing.start}</time></p><p>{item.summary}</p></article>)}</div>:<p>No events have been published yet.</p>}</main>;
}
