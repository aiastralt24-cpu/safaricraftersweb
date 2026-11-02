import type {Metadata} from 'next';
import type {PublishedProject} from './published-project.ts';
import type {GlobalSettings} from './global-settings.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import {publishedMediaUrl} from './published-journey.ts';
export function usesCmsProjects(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_PROJECT_DELIVERY_ENABLED==='true';}
export function publishedProjectMetadata(project:PublishedProject,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 const d=project.content,seo=d.seo;
 if(defaults)return resolvedSeoMetadata({...seo,description:seo.description||d.summary},defaults,{origin,path:project.path,title:d.title});
 const title=seo.title||d.title,description=seo.description||d.summary,canonical=seo.canonical||project.path,image=seo.socialImage||d.image;
 const images=image?[{url:publishedMediaUrl(image.assetId),alt:image.decorative?'':image.alt}]:[];
 return {title,description,alternates:{canonical},robots:{...(seo.indexing!=='inherit'?{index:seo.indexing==='index'}:{}),...(seo.following!=='inherit'?{follow:seo.following==='follow'}:{})},openGraph:{type:'website',title:seo.socialTitle||title,description:seo.socialDescription||description,url:canonical,images},twitter:{card:'summary_large_image',title:seo.socialTitle||title,description:seo.socialDescription||description,images}};
}
export function publishedProjectStructuredData(project:PublishedProject,origin:string){const d=project.content;return {'@context':'https://schema.org','@type':'CreativeWork',name:d.title,description:d.summary,url:new URL(project.path,origin).href,...(d.image?{image:new URL(publishedMediaUrl(d.image.assetId),origin).href}:{})};}
