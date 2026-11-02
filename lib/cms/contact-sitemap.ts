import {resolveSeoDefaults} from './seo-resolution.ts';
import type {loadContactRoute} from './contact-page-runtime.ts';
/** Published content only. No synthetic modification date or draft/legacy fallback. */
export function contactSitemapItems(content:Awaited<ReturnType<typeof loadContactRoute>>,origin:string){
 if(!content)return [];
 const {page,seoDefaults}=content,resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
