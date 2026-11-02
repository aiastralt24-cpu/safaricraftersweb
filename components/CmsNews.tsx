import {Breadcrumbs} from './Breadcrumbs';
import {CmsRichTextBlock} from './CmsRichTextBlock';
import type {PublishedNews} from '@/lib/cms/published-news';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsNews({news}:{news:PublishedNews}){
 const d=news.content,hero=d.heroImage||d.image;
 return <article className='article cms-public-news'>
  <header className={hero?'article-hero':'container'} style={hero?undefined:{paddingTop:'8rem',paddingBottom:'2rem'}}>
   {hero&&<><img src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high'/><div className='article-scrim'/></>}
   <div className={hero?'container article-hero-content':undefined}>
    <Breadcrumbs items={[{label:'Home',href:'/'},{label:'News',href:'/news'},{label:d.seo.breadcrumbLabel||d.title}]} variant={hero?'hero':undefined}/>
    <p className='eyebrow'>{d.kind==='pressRelease'?'Press release':'News'} · {d.topic}</p>
    <h1 className='display'>{d.title}</h1><p>{d.author} · <time dateTime={d.date}>{d.date}</time></p>
   </div>
  </header>
  <div className='article-body'>
   {hero&&(hero.caption||hero.credit)&&<p className='caption'>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
   <p className='intro'>{d.summary}</p>{d.dateline&&<p>{d.dateline}</p>}
   {d.body.map(block=><div key={block.id}>{block.kind==='heading'?(block.level==='h2'?<h2 className='h2'>{block.text}</h2>:<h3 className='h3'>{block.text}</h3>):block.kind==='image'?<figure><img src={publishedMediaUrl(block.image.assetId)} alt={block.image.decorative?'':block.image.alt} loading='lazy'/>{(block.image.caption||block.image.credit)&&<figcaption>{[block.image.caption,block.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>:<CmsRichTextBlock block={block}/>}</div>)}
   {d.gallery.length>0&&<section aria-label='News gallery'>{d.gallery.map((photo,i)=><figure key={i}><img src={publishedMediaUrl(photo.assetId)} alt={photo.decorative?'':photo.alt} loading='lazy'/>{(photo.caption||photo.credit)&&<figcaption>{[photo.caption,photo.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>)}</section>}
   {news.related.length>0&&<section aria-label='Related content'><h2 className='h2'>Related content</h2><ul>{news.related.map(item=><li key={item.href}><a href={item.href}>{item.title}</a>{item.type==='document'&&' (PDF)'}</li>)}</ul></section>}
   <p><a href='/news'>All news</a></p>
  </div>
 </article>;
}
