import type {Metadata} from 'next';
import type {PublishedEvent} from './published-event.ts';
import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import {publishedMediaUrl} from './published-journey.ts';
export function publishedEventMetadata(event:PublishedEvent,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 const d=event.content,seo=d.seo;
 if(defaults){const metadata=resolvedSeoMetadata({...seo,description:seo.description||d.summary},defaults,{origin,path:event.path,title:d.title});return metadata;}
 const title=seo.title||d.title,description=seo.description||d.summary,canonical=seo.canonical||event.path,image=seo.socialImage||d.heroImage||d.image;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},openGraph:{type:'website',title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,images},twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images}};
}

/** Schema.org projection of published facts only; no inferred ticket prices,
 * availability, organizer type or previous dates. */
export function publishedEventStructuredData(event:PublishedEvent,origin:string){
 const d=event.content,hero=d.heroImage||d.image;
 const physical={'@type':'Place',name:d.venue.name,address:{'@type':'PostalAddress',streetAddress:d.venue.address,addressLocality:d.venue.city,...(d.venue.region?{addressRegion:d.venue.region}:{}),addressCountry:d.venue.country}};
 const virtual={'@type':'VirtualLocation',url:d.onlineUrl};
 return {'@context':'https://schema.org','@type':'Event',name:d.title,description:d.summary,url:new URL(event.path,origin).href,
  startDate:d.timing.start,endDate:d.timing.end,
  eventStatus:'https://schema.org/'+({scheduled:'EventScheduled',postponed:'EventPostponed',rescheduled:'EventRescheduled',cancelled:'EventCancelled'}[d.status]),
  eventAttendanceMode:'https://schema.org/'+({inPerson:'OfflineEventAttendanceMode',online:'OnlineEventAttendanceMode',hybrid:'MixedEventAttendanceMode'}[d.attendance]),
  location:d.attendance==='inPerson'?physical:d.attendance==='online'?virtual:[physical,virtual],
  organizer:{name:d.organizer},...(hero?{image:new URL(publishedMediaUrl(hero.assetId),origin).href}:{}),
 };
}
