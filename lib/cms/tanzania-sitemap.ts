import {resolveSeoDefaults} from './seo-resolution.ts';
import type {readPublishedTanzania} from './published-tanzania.ts';
/** No draft fallback or invented modification date. */
export function tanzaniaSitemapItems(published:Awaited<ReturnType<typeof readPublishedTanzania>>,origin:string){
 if(!published)return [];
 const {content:{page},seoDefaults}=published,resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
