import {resolveSeoDefaults} from './seo-resolution.ts';
import type {readPublishedConcept} from './published-concept.ts';
/** Include only the current published canonical page, without invented dates. */
export function conceptSitemapItems(published:Awaited<ReturnType<typeof readPublishedConcept>>,origin:string){
 if(!published)return [];
 const {content:{page},seoDefaults}=published;
 const resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
