import {resolveSeoDefaults} from './seo-resolution.ts';
import type {loadAboutRoute} from './about-page-runtime.ts';
export function aboutSitemapItems(content:Awaited<ReturnType<typeof loadAboutRoute>>,origin:string){
 if(!content)return [];
 const {page,seoDefaults}=content,resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
