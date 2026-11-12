import { distinctTourFaqs, uniqueTourCopy } from '@/lib/tour-content';
import Link from 'next/link';
import {CmsExpeditionGallery} from './CmsExpeditionGallery';
import type {ReactNode} from 'react';
import type {PublishedExpedition} from '@/lib/cms/published-expedition';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
import './CmsExpedition.css';
/** Enquiry is supplied by the verified expedition form integration, never inferred from copy. */
export function CmsExpedition({expedition,enquiry}:{expedition:PublishedExpedition;enquiry:ReactNode}){
 const {content:d,upcoming}=expedition,hero=d.heroImage!,mobile=d.mobileHeroImage;
 const faqs=distinctTourFaqs(d.faqs,[d.equipment]);
 const opening=uniqueTourCopy([d.description,d.intro,...d.body.map(item=>item.text)],[d.heroCopy]);
 const facts=[[d.labels.duration,d.duration],[d.labels.route,d.route],[d.labels.skill,d.skill],[d.labels.groupSize,d.groupSize],[d.labels.season,d.bestMonths],[d.labels.species,d.species],[d.labels.price,d.price],['Mentor',d.mentor],['Guide',d.guide]].filter(([,value])=>value);
 return <article className='cms-public-expedition'>
  <header className='cms-expedition-hero'><div className='cms-expedition-hero-images'><img className={mobile?'cms-expedition-desktop-image':undefined} src={publishedMediaUrl(hero.assetId)} alt={hero.decorative?'':hero.alt} fetchPriority='high'/>{mobile&&<img className='cms-expedition-mobile-image' src={publishedMediaUrl(mobile.assetId)} alt={mobile.decorative?'':mobile.alt} fetchPriority='high'/>}</div><div><nav aria-label='Breadcrumb'><Link href='/'>Home</Link><span> / </span><Link href='/photo-expeditions'>Photography expeditions</Link></nav><p>{d.labels.heroEyebrow} · {d.geography} · {d.category}</p><h1>{d.heroTitle}</h1><p>{d.heroCopy}</p></div></header>
  {(hero.caption||hero.credit)&&<p className={`cms-expedition-credit ${mobile?'cms-expedition-desktop-image':''}`}>{[hero.caption,hero.credit].filter(Boolean).join(' · ')}</p>}
  {mobile&&(mobile.caption||mobile.credit)&&<p className='cms-expedition-credit cms-expedition-mobile-image'>{[mobile.caption,mobile.credit].filter(Boolean).join(' · ')}</p>}
  <div className='cms-expedition-content'>{d.title!==d.heroTitle&&<p>{d.title}</p>}{d.programmeStatus==='preview'&&d.labels.previewNote&&<aside className='cms-expedition-note'>{d.labels.previewNote}</aside>}
   {opening.length>0&&<section><h2>{d.labels.introductionHeading}</h2>{opening.map(text=><p key={text}>{text}</p>)}</section>}
   <dl className='cms-expedition-facts'>{facts.map(([label,value],index)=><div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   {d.equipment&&<details><summary>{d.labels.equipment}</summary><p>{d.equipment}</p></details>}
   <section><h2>{d.labels.departuresHeading}</h2>{d.dateLabel&&<p>{d.dateLabel}</p>}{upcoming.length?<ul className='cms-expedition-departures'>{upcoming.map(item=><li key={item.id}><div><time dateTime={item.date}>{item.date}</time>{item.endDate&&<> — <time dateTime={item.endDate}>{item.endDate}</time></>}<p>{item.availability}</p></div><strong>{item.status}</strong></li>)}</ul>:<p>{d.labels.emptyDepartures}</p>}{d.availabilityReviewedAt&&<p className='cms-expedition-small'>Availability reviewed: <time dateTime={d.availabilityReviewedAt}>{d.availabilityReviewedAt}</time></p>}<a className='button' href='#expedition-enquiry'>{d.labels.departureAction}</a></section>
   {d.days.length>0&&<section><h2>{d.labels.itineraryHeading}</h2><ol className='cms-expedition-days'>{d.days.map(day=><li key={day.id}><p>{day.label}</p><h3>{day.title}</h3><p>{day.copy}</p>{day.stay&&<p>Stay: {day.stay}</p>}</li>)}</ol></section>}
   {([['highlights',d.labels.highlightsHeading],['inclusions',d.labels.inclusionsHeading],['exclusions',d.labels.exclusionsHeading]] as const).map(([key,title])=>d[key].length>0&&<section key={key}><h2>{title}</h2><ul>{d[key].map(item=><li key={item.id}>{item.text}</li>)}</ul></section>)}
   {d.gallery.length>0&&<section aria-label={d.labels.galleryLabel||undefined}><p className='cms-expedition-small'>{d.labels.galleryEyebrow}</p><h2>{d.labels.galleryHeading}</h2><p>{d.labels.galleryCopy}</p><CmsExpeditionGallery>{d.gallery.map(item=><figure key={item.id}><img src={publishedMediaUrl(item.image.assetId)} alt={item.image.decorative?'':item.image.alt} loading='lazy'/>{(item.image.caption||item.image.credit)&&<figcaption>{[item.image.caption,item.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>)}</CmsExpeditionGallery></section>}
   {faqs.length>0&&<section><p className='cms-expedition-small'>{d.labels.faqEyebrow}</p><h2>{d.labels.faqHeading}</h2><p>{d.labels.faqCopy}</p>{faqs.map(item=><details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
   <section><p className='cms-expedition-small'>{d.booking.eyebrow}</p><h2>{d.booking.heading}</h2><p>{d.booking.introduction}</p><details><summary>{d.booking.paymentHeading}</summary><p>{d.booking.cancellationPolicy}</p><p>{d.booking.paymentNote}</p></details><details><summary>{d.booking.priceHeading}</summary><p>{d.booking.priceCopy}</p></details><Link className='button' href={d.booking.button.href} target={d.booking.button.newWindow?'_blank':undefined} rel={d.booking.button.newWindow?'noopener noreferrer':undefined}>{d.booking.button.label}</Link></section>
   {expedition.specialists.length>0&&<section aria-label='Expedition specialists'><ul>{expedition.specialists.map(person=><li key={`${person.role}:${person.recordId}`}><span>{person.role==='mentor'?'Mentor':'Guide'}: </span>{person.name}</li>)}</ul></section>}
   <section id='expedition-enquiry'><h2>{d.enquiry.heading}</h2><p>{d.enquiry.introduction}</p>{d.enquiry.specialistName&&<p>{d.enquiry.specialistName}</p>}{enquiry}</section>
  </div>
 </article>;
}
