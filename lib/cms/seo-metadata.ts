import type {Metadata} from 'next';
import type {GlobalSettings} from './global-settings.ts';
import type {PageSeo} from './page-seo.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import {publishedMediaUrl} from './published-journey.ts';
/** Absolute title avoids applying the parent Next.js title template twice. */
export function resolvedSeoMetadata(seo:PageSeo,defaults:GlobalSettings['seo'],context:{origin:string;path:string;title:string}):Metadata{
 const resolved=resolveSeoDefaults(seo,defaults,context),image=resolved.socialImage.value;
 const images=image?[{url:new URL(publishedMediaUrl(image.assetId),context.origin).href,alt:image.decorative?'':image.alt}]:[];
 return {title:{absolute:resolved.title.value},description:resolved.description.value,alternates:{canonical:resolved.canonical.value},
  robots:{index:resolved.indexing.value==='index',follow:resolved.following.value==='follow'},
  openGraph:{title:resolved.socialTitle.value,description:resolved.socialDescription.value,url:resolved.canonical.value,images},
  twitter:{card:'summary_large_image',title:resolved.socialTitle.value,description:resolved.socialDescription.value,images}};
}
