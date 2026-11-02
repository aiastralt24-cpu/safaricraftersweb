import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedApplication} from '@/lib/cms/published-application';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsApplication({profile}:{profile:PublishedApplication}){
 const d=profile.content,hero=d.image,root=d.kind==='industry'?'/industries':'/applications',label=d.kind==='industry'?'Industries':'Applications';
 return <article className='article cms-public-application'>
  <header className='container' style={{paddingTop:'8rem',paddingBottom:'2rem'}}>
   <Breadcrumbs items={[{label:'Home',href:'/'},{label,href:root},{label:d.seo.breadcrumbLabel||d.title}]}/>
   <p className='eyebrow'>{d.kind==='industry'?'Industry':'Application'}</p><h1 className='display'>{d.title}</h1>
   {hero&&<img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high' style={{width:'100%',maxWidth:'48rem',height:'auto',marginTop:'2rem'}}/>}
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p>
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {profile.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{profile.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <p><a href={root}>All {label.toLowerCase()}</a></p>
  </div>
 </article>;
}
