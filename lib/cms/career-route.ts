import type {Metadata} from 'next';
import type {PublishedCareer} from './published-career.ts';
import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import {publishedMediaUrl} from './published-journey.ts';
export {usesCmsCareer} from './public-career-runtime.ts';
export function publishedCareerMetadata(profile:PublishedCareer,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 const d=profile.content,seo=d.seo;
 if(defaults)return resolvedSeoMetadata({...seo,description:seo.description||d.summary},defaults,{origin,path:profile.path,title:d.title});
 const title=seo.title||d.title,description=seo.description||d.summary,canonical=seo.canonical||profile.path,image=seo.socialImage||d.image;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},openGraph:{type:'website',title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,images},twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images}};
}
