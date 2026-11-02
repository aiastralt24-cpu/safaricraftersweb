import type {Metadata} from 'next';
import type {GlobalSettings} from './global-settings.ts';
import {publishedMediaUrl} from './published-journey.ts';
/** Child metadata remains authoritative for page-specific copy; website noindex also uses an HTTP header. */
export function rootSeoMetadata(base:Metadata,defaults:GlobalSettings['seo']):Metadata{
 const defaultTitle=typeof base.title==='string'?base.title:base.title&&'default' in base.title?base.title.default:'Safari Crafters';
 const image=defaults.socialImage;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {...base,title:{default:defaultTitle,template:defaults.titleTemplate},description:defaults.description,
  ...(defaults.indexing==='noindex'?{robots:{...(typeof base.robots==='object'?base.robots:{}),index:false}}:{}),
  openGraph:{...base.openGraph,description:defaults.description,images},
  twitter:{...base.twitter,card:'summary_large_image',description:defaults.description,images}};
}
export function websiteIndexingHeaders(defaults:GlobalSettings['seo']|undefined):Record<string,string>{
 return defaults?.indexing==='noindex'?{'X-Robots-Tag':'noindex'}:{};
}
