import type {GlobalSettings} from './global-settings.ts';
import type {PublishedExpeditionCard} from './public-expedition-directory.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import type {loadExpeditionRoute} from './expedition-page-runtime.ts';

/** Only a fully readable atlas page may appear; its SEO does not suppress independent detail pages. */
export function expeditionAtlasSitemapItems(content:Awaited<ReturnType<typeof loadExpeditionRoute>>,origin:string){
 if(!content)return [];
 const {page,seoDefaults}=content;
 const resolved=resolveSeoDefaults(page.seo,seoDefaults,{origin,path:page.path,title:page.title});
 return resolved.sitemap.value?[{url:resolved.canonical.value}]:[];
}
/** Input must come from the complete publication-authorized directory traversal. */
export function expeditionSitemapItems(cards:PublishedExpeditionCard[],origin:string,defaults?:GlobalSettings['seo']){
 const seen=new Set<string>();
 return cards.flatMap(item=>{
  if(item.path!==`/photo-expeditions/${item.content.slug}`||seen.has(item.path))throw Error('Expedition sitemap identity mismatch.');seen.add(item.path);
  const resolved=resolveSeoDefaults(item.content.seo,defaults??{titleTemplate:'%s',description:item.content.description,indexing:'index'}, {origin,path:item.path,title:item.content.title});
  return resolved.sitemap.value?[{url:resolved.canonical.value}]:[];
 });
}
