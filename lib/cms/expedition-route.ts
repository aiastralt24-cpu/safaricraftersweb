import type {Metadata} from 'next';
import type {GlobalSettings} from './global-settings.ts';
import type {PublishedExpedition} from './published-expedition.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
/** Explicit rendering selection: a configured rollout must not fall back to legacy data on error. */
export function usesCmsExpedition(env:Record<string,string|undefined>=process.env){return env.CMS_EXPEDITION_DELIVERY_ENABLED==='true';}
function context(expedition:PublishedExpedition,defaults:GlobalSettings['seo']|undefined,origin:string){
 const d=expedition.content;
 return {seo:d.seo,defaults:defaults??{titleTemplate:'%s',description:d.description,indexing:'index' as const,socialImage:d.heroImage??d.image},page:{origin,path:`/photo-expeditions/${d.slug}`,title:d.title}};
}
/** Shared resolver preserves website noindex restrictions and avoids duplicate title templates. */
export function publishedExpeditionMetadata(expedition:PublishedExpedition,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'):Metadata{
 const c=context(expedition,defaults,origin);return resolvedSeoMetadata(c.seo,c.defaults,c.page);
}
/** Eligibility only; caller must enumerate currently deliverable published expeditions. */
export function publishedExpeditionSitemapEntry(expedition:PublishedExpedition,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const c=context(expedition,defaults,origin),resolved=resolveSeoDefaults(c.seo,c.defaults,c.page);
 return resolved.sitemap.value?{url:resolved.canonical.value}:null;
}
