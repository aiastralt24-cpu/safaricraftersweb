import {resolveSeoDefaults} from './seo-resolution.ts';
import type {readPublishedGuided} from './published-guided.ts';
/** No draft fallback or invented modification date. */
export function guidedSitemapItems(published:Awaited<ReturnType<typeof readPublishedGuided>>,origin:string){
 if(!published)return [];
 const {content:{page},seoDefaults}=published,resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
