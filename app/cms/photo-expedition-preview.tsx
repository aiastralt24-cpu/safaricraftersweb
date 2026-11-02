'use client';
import {useState} from 'react';
import {projectPhotoExpeditionPreview} from '../../lib/cms/photo-expedition-preview';
import {photoExpeditionSchema} from '../../lib/cms/photo-expeditions';
import {MediaImage,type LoadMediaPreview} from './media-image';
import type {SectionImage} from '../../lib/cms/composition';
import {ReferencedFormPreview} from './referenced-form-preview';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import './photo-expedition-preview.css';

export function PhotoExpeditionPreview({value,loadPreview,loadRecord}:{value:unknown;loadPreview:LoadMediaPreview;loadRecord?:LoadFormPreview}){
 const [today,setToday]=useState(()=>new Date().toISOString().slice(0,10)),[hero,setHero]=useState<'desktop'|'mobile'>('desktop');
 const parsed=photoExpeditionSchema.safeParse(value);
 if(!parsed.success)return <p role='alert'>This expedition needs repair before previewing. Its saved content has not been changed.</p>;
 let projection;try{projection=projectPhotoExpeditionPreview(parsed.data,today);}catch{return <div><label>Preview date (UTC)<input aria-label='Preview date (UTC)' type='date' value={today} onChange={e=>setToday(e.target.value)}/></label><p role='alert'>Choose a valid preview date.</p></div>;}
 const d=projection.content;
 const photo=(image:SectionImage,label:string)=><figure><MediaImage key={image.assetId} asset={image.assetId} alt={image.decorative?'':image.alt} load={loadPreview}/>{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}<small>{label}</small></figure>;
 const heading=(text:string)=>text||'[Heading not written yet]';
 const departures=(items:typeof projection.upcoming)=><ul>{items.map(item=><li key={item.id}><time dateTime={item.date}>{item.date}</time>{item.endDate&&<> — <time dateTime={item.endDate}>{item.endDate}</time></>}<p>{item.status}{item.availability&&` · ${item.availability}`}</p></li>)}</ul>;
 const picture=hero==='mobile'?d.mobileHeroImage:d.heroImage;
 return <article className='cms-expedition-preview'>
  <p>Draft expedition preview. Dates and availability are editorial content, not confirmed inventory. This preview cannot submit an enquiry or publish the expedition.</p>
  <label>Preview date (UTC)<input aria-label='Preview date (UTC)' type='date' value={today} onChange={e=>setToday(e.target.value)}/></label>
  <header><p>{d.labels.heroEyebrow} · {d.geography} · {d.category}</p><h2>{d.heroTitle||d.title}</h2><p>{d.heroCopy}</p><p>Expedition: {d.title}</p><p>{d.description}</p>
   <label>Preview hero image<select aria-label='Preview hero image' value={hero} onChange={e=>setHero(e.target.value as 'desktop'|'mobile')}><option value='desktop'>Desktop</option><option value='mobile'>Mobile</option></select></label>
   {picture?photo(picture,`${hero==='desktop'?'Desktop':'Mobile'} hero image`):<p>{hero==='mobile'?'No separate mobile hero image selected.':'No desktop hero image selected.'}</p>}
   {d.programmeStatus==='preview'&&<p role='note'>{d.labels.previewNote||'Programme preview note has not been written yet.'}</p>}
  </header>
  <section><h3>{heading(d.labels.introductionHeading)}</h3><p>{d.intro}</p>{d.body.map(item=><p key={item.id}>{item.text}</p>)}</section>
  <dl>{[[d.labels.duration,d.duration],[d.labels.route,d.route],[d.labels.skill,d.skill],[d.labels.groupSize,d.groupSize],[d.labels.season,d.bestMonths],[d.labels.species,d.species],[d.labels.price,d.price],['Mentor',d.mentor],['Guide',d.guide],['Original date wording',d.dateLabel],['Availability reviewed',d.availabilityReviewedAt]].filter(([,text])=>text).map(([label,text],index)=><div key={index}><dt>{heading(label)}</dt><dd>{text}</dd></div>)}</dl>
  {d.equipment&&<details><summary>{heading(d.labels.equipment)}</summary><p>{d.equipment}</p></details>}
  <section><h3>{heading(d.labels.departuresHeading)}</h3><p>Departures starting on or after {today}.</p>{projection.upcoming.length?departures(projection.upcoming):<p>{d.labels.emptyDepartures||'[Empty-departure message not written yet]'}</p>}{projection.earlier.length>0&&<details><summary>Earlier departures retained in this draft ({projection.earlier.length})</summary>{departures(projection.earlier)}</details>}<button type='button' disabled>{d.labels.departureAction||'[Enquiry action not written yet]'}</button></section>
  {d.days.length>0&&<section><h3>{heading(d.labels.itineraryHeading)}</h3><ol>{d.days.map(day=><li key={day.id}><p>{day.label}</p><h4>{day.title||'[Day title not written yet]'}</h4><p>{day.copy}</p>{day.stay&&<p>Stay: {day.stay}</p>}</li>)}</ol></section>}
  {([['highlights',d.labels.highlightsHeading],['inclusions',d.labels.inclusionsHeading],['exclusions',d.labels.exclusionsHeading]] as const).map(([key,title])=>d[key].length>0&&<section key={key}><h3>{heading(title)}</h3><ul>{d[key].map(item=><li key={item.id}>{item.text}</li>)}</ul></section>)}
  {d.image&&<details><summary>Listing image</summary>{photo(d.image,'Listing image')}</details>}
  {d.gallery.length>0&&<section aria-label={d.labels.galleryLabel||'Draft gallery'}><p>{d.labels.galleryEyebrow}</p><h3>{heading(d.labels.galleryHeading)}</h3><p>{d.labels.galleryCopy}</p>{d.gallery.map(item=><div key={item.id}>{photo(item.image,'Gallery image')}</div>)}</section>}
  {d.faqs.length>0&&<section><p>{d.labels.faqEyebrow}</p><h3>{heading(d.labels.faqHeading)}</h3><p>{d.labels.faqCopy}</p>{d.faqs.map(item=><details key={item.id}><summary>{item.question||'[Question not written yet]'}</summary><p>{item.answer}</p></details>)}</section>}
  {d.video&&<section><h3>{d.video.title||'[Film title not written yet]'}</h3>{photo(d.video.poster,'Film poster')}<p>{d.video.caption}</p><p>Film playback and captions delivery are not connected yet.</p><details><summary>Film transcript</summary><p>{d.video.transcript}</p></details></section>}
  <section><p>{d.booking.eyebrow}</p><h3>{heading(d.booking.heading)}</h3><p>{d.booking.introduction}</p><details><summary>{heading(d.booking.paymentHeading)}</summary><p>{d.booking.cancellationPolicy}</p><p>{d.booking.paymentNote}</p></details><details><summary>{heading(d.booking.priceHeading)}</summary><p>{d.booking.priceCopy}</p></details><button type='button' disabled>{d.booking.button.label}</button><p>Booking action disabled in preview. Destination: {d.booking.button.href}</p></section>
  {d.specialists.length>0&&<section><h3>Linked specialist identities</h3><p>Related profiles are not loaded by this preview; they require separate access and publication checks.</p><ul>{d.specialists.map(item=><li key={`${item.role}:${item.recordId}`}>{item.role}: {item.recordId}</li>)}</ul></section>}
  <section><h3>{heading(d.enquiry.heading)}</h3><p>{d.enquiry.introduction}</p><p>Enquiry specialist: {d.enquiry.specialistName||'Not set'}</p>{d.enquiry.form?<ReferencedFormPreview key={d.enquiry.form.recordId} id={d.enquiry.form.recordId} load={loadRecord}/>:<p>No enquiry form selected.</p>}<p>Departure selection and submission context are not connected. This preview does not submit data.</p></section>
 </article>;
}
