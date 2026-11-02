import {resolveSeoDefaults} from './seo-resolution.ts';
import type {readPublishedKenya} from './published-kenya.ts';
/** No draft fallback or invented modification date. */
export function kenyaSitemapItems(published:Awaited<ReturnType<typeof readPublishedKenya>>,origin:string){
 if(!published)return [];
 const {content:{page},seoDefaults}=published,resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
