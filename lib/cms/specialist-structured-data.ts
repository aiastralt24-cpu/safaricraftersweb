import type {PublishedSpecialist} from './public-specialists.ts';
import {publishedMediaUrl} from './published-journey.ts';

/** Teams are not people. Directory identity is stable across name changes. */
export function publishedSpecialistStructuredData(profile:PublishedSpecialist,origin:string){
 if(profile.payload.kind!=='person')return null;
 const value=profile.payload;
 return {
  '@context':'https://schema.org','@type':'Person',
  '@id':new URL(`/specialists#specialist-${profile.recordId}`,origin).href,
  name:value.name,jobTitle:value.role,description:value.bio,knowsAbout:value.expertise,
  image:new URL(publishedMediaUrl(value.image!.assetId),origin).href,
  worksFor:{'@id':new URL('/#organization',origin).href},
 };
}
