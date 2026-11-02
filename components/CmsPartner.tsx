import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedPartner} from '@/lib/cms/published-partner';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsPartner({profile}:{profile:PublishedPartner}){
 const d=profile.content,hero=d.image,root='/partners',label='Partners';
 return <article className='article cms-public-partner'>
  <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}>
   <Breadcrumbs items={[{label:'Home',href:'/'},{label,href:root},{label:d.seo.breadcrumbLabel||d.title}]}/>
   <p className='eyebrow'>{{dealer:'Dealer',servicePartner:'Service partner',both:'Dealer and service partner'}[d.kind]}</p><h1 className='display'>{d.title}</h1>
   {hero&&<img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high' style={{width:'100%',maxWidth:'48rem',height:'auto',marginTop:'2rem'}}/>}
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p><section aria-label='Partner details'><h2 className='h2'>Services and coverage</h2><ul>{d.services.map(service=><li key={service}>{service}</li>)}</ul><h3 className='h3'>Areas served</h3><ul>{d.coverage.map(area=><li key={area.countryCode}>{area.countryCode}: {area.regions.length?area.regions.join(', '):'All regions'}</li>)}</ul>{d.statusNote&&<p>{d.statusNote}</p>}<h3 className='h3'>Contact</h3>{d.contact.email&&<p><a href={'mailto:'+d.contact.email}>{d.contact.email}</a></p>}{d.contact.phone&&<p>Telephone: {d.contact.phone}</p>}{d.contact.website&&<p><a href={d.contact.website}>Partner website</a></p>}</section>
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {profile.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{profile.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <p><a href={root}>All {label.toLowerCase()}</a></p>
  </div>
 </article>;
}
