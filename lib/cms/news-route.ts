import type {Metadata} from 'next';
import type {PublishedNews} from './published-news.ts';
import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import {publishedMediaUrl} from './published-journey.ts';
export function usesCmsNews(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_NEWS_DELIVERY_ENABLED==='true';}
export function publishedNewsMetadata(news:PublishedNews,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 const d=news.content,seo=d.seo;
 if(defaults){const metadata=resolvedSeoMetadata({...seo,description:seo.description||d.summary},defaults,{origin,path:news.path,title:d.title});return {...metadata,openGraph:{...metadata.openGraph,type:'article',publishedTime:d.date,authors:[d.author]}};}
 const title=seo.title||d.title,description=seo.description||d.summary,canonical=seo.canonical||news.path,image=seo.socialImage||d.heroImage||d.image;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},openGraph:{type:'article',publishedTime:d.date,authors:[d.author],title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,images},twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images}};
}
export function publishedNewsStructuredData(news:PublishedNews,origin:string){const d=news.content,image=d.heroImage||d.image;return {'@context':'https://schema.org','@type':'NewsArticle',headline:d.title,description:d.summary,datePublished:d.date,author:{'@type':'Person',name:d.author},mainEntityOfPage:new URL(news.path,origin).href,...(image?{image:new URL(publishedMediaUrl(image.assetId),origin).href}:{})};}
