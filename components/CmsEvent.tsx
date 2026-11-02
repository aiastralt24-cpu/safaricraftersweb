import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedEvent} from '@/lib/cms/published-event';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsEvent({event}:{event:PublishedEvent}){
 const d=event.content,hero=d.heroImage||d.image;
 return <article className='article cms-public-event'>
  <header className={hero?'article-hero':'container'} style={hero?undefined:{paddingTop:'8rem',paddingBottom:'2rem'}}>
   {hero&&<><img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high'/><div className='article-scrim'/></>}
   <div className={hero?'container article-hero-content':undefined}>
    <Breadcrumbs items={[{label:'Home',href:'/'},{label:'Events',href:'/events'},{label:d.seo.breadcrumbLabel||d.title}]} variant={hero?'hero':undefined}/>
    <p className='eyebrow'>{d.category} · {d.status}</p>
    <h1 className='display'>{d.title}</h1><p>{d.organizer} · {d.attendance==='inPerson'?'In person':d.attendance==='online'?'Online':'Hybrid'}</p>
   </div>
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p><p><time dateTime={d.timing.start}>{d.timing.start}</time> – <time dateTime={d.timing.end}>{d.timing.end}</time>{d.timing.mode==='allDay'?' (all day; end date inclusive)':''}</p>
   {d.statusNote&&<p role='note'>{d.statusNote}</p>}
   {d.attendance!=='online'&&<section aria-label='Venue'><h2 className='h2'>{d.venue.name}</h2><p>{[d.venue.address,d.venue.city,d.venue.region,d.venue.country].filter(Boolean).join(', ')}</p></section>}
   {d.attendance!=='inPerson'&&d.onlineUrl&&<p><a href={d.onlineUrl}>Online event information</a></p>}
   {d.registration.enabled&&!['cancelled','postponed'].includes(d.status)&&<p><a className='btn' href={d.registration.href}>{d.registration.label}</a></p>}
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {d.gallery.length>0&&<section aria-label='Event gallery'>{d.gallery.map((photo,i)=><figure key={i}><img src={publishedMediaUrl(photo.assetId)} alt={photo.decorative?'':photo.alt} loading='lazy'/>{(photo.caption||photo.credit)&&<figcaption>{[photo.caption,photo.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>)}</section>}
   {event.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{event.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <p><a href='/events'>All events</a></p>
  </div>
 </article>;
}
