import {notFound} from 'next/navigation';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {usesCmsLeadership} from '@/lib/cms/leadership-route';
import {publicLeadershipConfig,readPublishedLeadershipList} from '@/lib/cms/public-leadership-runtime';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export const dynamic='force-dynamic';
export async function generateMetadata(){if(!usesCmsLeadership())notFound();const defaults=await readSeoDefaults();return {title:'Leadership',description:'Meet our leadership team.',alternates:{canonical:'/leadership'},robots:{index:defaults?.indexing!=='noindex'}};}
export default async function LeadershipPage(){
 if(!usesCmsLeadership())notFound();const items=await readPublishedLeadershipList(publicLeadershipConfig());
 return <main className='container' style={{paddingBlock:'8rem 4rem'}}><h1 className='display'>Leadership</h1>{items.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,20rem),1fr))',gap:'2rem',marginTop:'3rem'}}>{items.map(item=><article key={item.recordId}><a href={item.path}>{item.image&&<img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover'}}/>}<h2 className='h3'>{item.title}</h2></a><p>{item.role}{item.department&&` · ${item.department}`}{item.status==='former'&&' · Former leadership'}</p><p>{item.summary}</p></article>)}</div>:<p>No leadership profiles have been published yet.</p>}</main>;
}
