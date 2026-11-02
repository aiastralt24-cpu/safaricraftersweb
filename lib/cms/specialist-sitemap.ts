import {resolveSeoDefaults} from './seo-resolution.ts';
import type {loadSpecialistRoute} from './specialist-page-runtime.ts';

/** Only a fully readable published page can enter the migrated sitemap. */
export function specialistSitemapItems(content:Awaited<ReturnType<typeof loadSpecialistRoute>>,origin:string){
 if(!content)return [];
 const {page,seoDefaults}=content;
 const resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 // The published envelope has no authoritative modification time. Do not invent one.
 return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
}
