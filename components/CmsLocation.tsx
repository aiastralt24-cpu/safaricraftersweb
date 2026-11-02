import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedLocation} from '@/lib/cms/published-location';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsLocation({profile}:{profile:PublishedLocation}){
 const d=profile.content,hero=d.image,root='/locations',label='Locations';
 return <article className='article cms-public-location'>
  <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}>
   <Breadcrumbs items={[{label:'Home',href:'/'},{label,href:root},{label:d.seo.breadcrumbLabel||d.title}]}/>
   <p className='eyebrow'>{{office:'Office',showroom:'Showroom',serviceCentre:'Service centre',warehouse:'Warehouse',other:'Location'}[d.kind]}</p><h1 className='display'>{d.title}</h1>
   {hero&&<img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high' style={{width:'100%',maxWidth:'48rem',height:'auto',marginTop:'2rem'}}/>}
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p><section aria-label='Location details'><h2 className='h2'>Visit and contact</h2><address>{d.address.lines.map((line,i)=><div key={i}>{line}</div>)}<div>{[d.address.locality,d.address.region,d.address.postalCode,d.address.countryCode].filter(Boolean).join(', ')}</div></address><p>{d.visiting==='noPublicAccess'?'No public access':d.visiting==='appointmentOnly'?'Visits by appointment':'Walk-in visitors welcome'}</p>{d.contact.email&&<p><a href={'mailto:'+d.contact.email}>{d.contact.email}</a></p>}{d.contact.phone&&<p>Telephone: {d.contact.phone}</p>}{d.contact.website&&<p><a href={d.contact.website}>Location website</a></p>}{d.hours.length>0&&<><h3 className='h3'>Opening hours</h3><p>Local time: {d.timeZone}</p><ul>{[...d.hours].sort((a,b)=>a.day-b.day).map(day=><li key={day.day}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][day.day-1]}: {day.intervals.length?day.intervals.map(i=>`${i.opens}–${i.closes}`).join(', '):'Closed'}</li>)}</ul><p>Days not listed have no published hours.</p></>}{d.accessibilityNotes&&<><h3 className='h3'>Accessibility</h3><p>{d.accessibilityNotes}</p></>}</section>
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {profile.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{profile.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <p><a href={root}>All {label.toLowerCase()}</a></p>
  </div>
 </article>;
}
