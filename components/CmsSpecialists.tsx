import Link from 'next/link';
import type {PublishedSpecialist} from '@/lib/cms/public-specialists';
import {publishedMediaUrl} from '@/lib/cms/published-journey';
import './CmsSpecialists.css';

/** Labels come from the containing page, rather than hidden editorial defaults. */
export function CmsSpecialists({profiles,relatedHeading,emptyMessage,embedded=false,headingLevel='h2'}:{profiles:PublishedSpecialist[];relatedHeading:string;emptyMessage:string;embedded?:boolean;headingLevel?:'h2'|'h3'|'h4'}){
 const Heading=headingLevel,RelatedHeading=headingLevel==='h2'?'h3':headingLevel==='h3'?'h4':'h5';
 return <section className={embedded?undefined:'section surface-white'}>
  <div className={`${embedded?'':'container '}cms-specialist-list`}>
   {profiles.length===0?<p>{emptyMessage}</p>:profiles.map(profile=>{
    const value=profile.payload,image=value.image!;
    return <article key={profile.recordId} id={`specialist-${profile.recordId}`} aria-labelledby={`specialist-name-${profile.recordId}`}>
     <figure className='cms-specialist-portrait'>
      <div className='image-frame'><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading='lazy'/></div>
      {(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}
     </figure>
     <div className='cms-specialist-copy'>
      <p className='eyebrow'>{value.role}</p><Heading className='h2' id={`specialist-name-${profile.recordId}`}>{value.name}</Heading>
      <p className='intro'>{value.expertise}</p><p>{value.bio}</p>
      {value.moment&&<blockquote>{value.moment}</blockquote>}
      {profile.relatedJourneys.length>0&&<div className='specialist-work'><RelatedHeading className='eyebrow'>{relatedHeading}</RelatedHeading>{profile.relatedJourneys.map(journey=><Link key={journey.recordId} href={journey.path}>{journey.title}</Link>)}</div>}
      <Link className='button' href={profile.planningHref}>{value.planning.label}</Link>
     </div>
    </article>;
   })}
  </div>
 </section>;
}
