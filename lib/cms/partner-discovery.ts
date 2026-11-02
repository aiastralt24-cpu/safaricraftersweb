import {usesCmsPartner,publicPartnerConfig,readPublishedPartnerList} from './public-partner-runtime.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import type {GlobalSettings} from './global-settings.ts';
type Items=Awaited<ReturnType<typeof readPublishedPartnerList>>;
const fallback:GlobalSettings['seo']={titleTemplate:'%s',description:'',indexing:'index'};
export async function loadPartnerDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){if(!usesCmsPartner(env))return null;return readPublishedPartnerList(publicPartnerConfig(env,fetcher));}
function resolved(item:Items[number],defaults:GlobalSettings['seo']|undefined,origin:string){return resolveSeoDefaults(item.seo,defaults??fallback,{origin,path:item.path,title:item.title});}
export function partnerSearchItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return items.filter(item=>{const seo=resolved(item,defaults,origin);return seo.indexing.value!=='noindex'&&seo.canonical.value===new URL(item.path,origin).href;}).map(item=>({title:item.title,href:item.path,type:'Partner' as const,detail:{dealer:'Dealer',servicePartner:'Service partner',both:'Dealer and service partner'}[item.kind],searchText:item.summary}));
}
export function partnerSitemapItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const eligible=items.filter(item=>resolved(item,defaults,origin).sitemap.value);if(!eligible.length)return [];
 return [{url:new URL('/partners',origin).href,lastModified:new Date(Math.max(...eligible.map(item=>Date.parse(item.modifiedAt))))},...eligible.map(item=>({url:new URL(item.path,origin).href,lastModified:new Date(item.modifiedAt)}))];
}
