import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {Metadata} from 'next';
import type {PublishedDestination} from './published-destination.ts';
import {publishedMediaUrl} from './published-journey.ts';

/** Country/atlas routes keep their separate templates until those are migrated. */
export function usesCmsDestination(slug:string,reservedSlugs:readonly string[],env:Record<string,string|undefined>=process.env){
 return env.CMS_DESTINATION_RENDERING_ENABLED==='true'&&!reservedSlugs.includes(slug);
}

export function publishedDestinationMetadata(destination:PublishedDestination,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 if(defaults)return resolvedSeoMetadata(destination.content.seo,defaults,{origin,path:`/destinations/${destination.content.slug}`,title:destination.content.title});
 const d=destination.content,seo=d.seo;
 const title=seo.title||d.title,description=seo.description||d.description;
 const canonical=seo.canonical||`/destinations/${d.slug}`;
 const image=seo.socialImage||d.heroImage;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},
  robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},
  openGraph:{title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,images},
  twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images},
 };
}
