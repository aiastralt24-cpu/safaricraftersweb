import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {Metadata} from 'next';
import type {PublishedJournal} from './published-journal.ts';
import {publishedMediaUrl} from './published-journey.ts';
export function usesCmsJournal(env:Record<string,string|undefined>=process.env){return env.CMS_JOURNAL_DELIVERY_ENABLED==='true';}
export function publishedJournalMetadata(article:PublishedJournal,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 if(defaults){const result=resolvedSeoMetadata(article.content.seo,defaults,{origin,path:article.path,title:article.content.title});return {...result,openGraph:{...result.openGraph,type:'article',publishedTime:article.content.date,authors:[article.content.author]}};}
 const d=article.content,seo=d.seo,title=seo.title||d.title,description=seo.description||d.description,canonical=seo.canonical||article.path,image=seo.socialImage||d.heroImage||d.image;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},openGraph:{type:'article',title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,publishedTime:d.date,authors:[d.author],images},twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images}};
}
export function publishedJournalStructuredData(article:PublishedJournal,origin:string){
 const d=article.content,image=d.heroImage||d.image;
 return {'@context':'https://schema.org','@type':'Article',headline:d.title,description:d.description,datePublished:d.date,author:{'@type':'Person',name:d.author},mainEntityOfPage:new URL(article.path,origin).href,...(image?{image:new URL(publishedMediaUrl(image.assetId),origin).href}:{})};
}
