import Link from 'next/link';
import type {PublishedJourney} from '@/lib/cms/published-journey';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
export function CmsJourney({journey}:{journey:PublishedJourney}){
 const hero=journey.media?.find(item=>item.role==='hero'),mobile=journey.media?.find(item=>item.role==='mobileHero'),gallery=journey.media?.filter(item=>item.role==='gallery')??[];
 const facts=[['Duration',journey.duration],['Region',journey.region],['Best months',journey.bestMonths],['Group size',journey.groupSize],['Activity level',journey.difficulty],['Price guidance',journey.price]].filter(([,value])=>value);
 return <article className='cms-public-journey'><header className={`cms-journey-hero ${hero?'has-image':''}`}>
 {hero&&<picture>{mobile&&<source media='(max-width: 640px)' srcSet={publishedMediaUrl(mobile.assetId)}/>}<img src={publishedMediaUrl(hero.assetId)} alt={hero.alt} fetchPriority='high'/></picture>}
 <div className='cms-journey-heading'><nav aria-label='Breadcrumb'><Link href='/'>Home</Link><span> / </span><Link href='/journeys'>Journeys</Link></nav><p className='cms-journey-eyebrow'>{journey.region}</p><h1>{journey.title}</h1><p>{journey.description}</p></div></header>
 <div className='cms-journey-body'><section aria-labelledby='journey-overview'><h2 id='journey-overview'>The journey</h2><p className='cms-journey-copy'>{journey.intro}</p><dl className='cms-journey-facts'>{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
 {Boolean(journey.itinerary?.length)&&<section aria-labelledby='journey-itinerary'><h2 id='journey-itinerary'>Day by day</h2><ol className='cms-journey-itinerary'>{journey.itinerary!.map(item=><li key={item.itemId}><p className='cms-journey-eyebrow'>{item.label}</p><h3>{item.title}</h3><p className='cms-journey-copy'>{item.copy}</p>{item.stay&&<p>Stay: {item.stay}</p>}</li>)}</ol></section>}
 {gallery.length>0&&<section aria-labelledby='journey-gallery'><h2 id='journey-gallery'>From the field</h2><div className='cms-journey-gallery'>{gallery.map(item=><figure key={item.itemId}><img src={publishedMediaUrl(item.assetId)} alt={item.alt} loading='lazy'/>{(item.caption||item.credit)&&<figcaption>{item.caption}{item.credit&&<small>{item.credit}</small>}</figcaption>}</figure>)}</div></section>}
 {Boolean(journey.faqs?.length)&&<section aria-labelledby='journey-questions'><h2 id='journey-questions'>Journey questions</h2>{journey.faqs!.map(item=><details key={item.itemId}><summary>{item.question}</summary><p className='cms-journey-copy'>{item.answer}</p></details>)}</section>}
 <section className='cms-journey-enquire'><h2>Plan your journey</h2><Link href={`/plan?journey=${encodeURIComponent(journey.slug)}`} className='button button-solid'>{journey.buttonLabel||'Begin planning'}</Link></section></div></article>;
}
