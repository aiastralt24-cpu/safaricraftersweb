import {resolveSeoDefaults} from './seo-resolution.ts';
import type {loadLegalRoute} from './legal-page-runtime.ts';
export function legalSitemapItems(contents:Awaited<ReturnType<typeof loadLegalRoute>>[],origin:string){
 return contents.flatMap(content=>{
  if(!content)return [];
  const {page,seoDefaults}=content;
  const resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
  return resolved.sitemap.value?[{url:new URL(page.path,origin).href}]:[];
 });
}
