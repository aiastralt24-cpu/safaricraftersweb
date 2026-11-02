import {usesCmsLocation,publicLocationConfig,readPublishedLocationList} from './public-location-runtime.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import type {GlobalSettings} from './global-settings.ts';
type Items=Awaited<ReturnType<typeof readPublishedLocationList>>;
const fallback:GlobalSettings['seo']={titleTemplate:'%s',description:'',indexing:'index'};
export async function loadLocationDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){if(!usesCmsLocation(env))return null;return readPublishedLocationList(publicLocationConfig(env,fetcher));}
function resolved(item:Items[number],defaults:GlobalSettings['seo']|undefined,origin:string){return resolveSeoDefaults(item.seo,defaults??fallback,{origin,path:item.path,title:item.title});}
export function locationSearchItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return items.filter(item=>{const seo=resolved(item,defaults,origin);return seo.indexing.value!=='noindex'&&seo.canonical.value===new URL(item.path,origin).href;}).map(item=>({title:item.title,href:item.path,type:'Location' as const,detail:{office:'Office',showroom:'Showroom',serviceCentre:'Service centre',warehouse:'Warehouse',other:'Location'}[item.kind],searchText:item.summary}));
}
export function locationSitemapItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const eligible=items.filter(item=>resolved(item,defaults,origin).sitemap.value);if(!eligible.length)return [];
 return [{url:new URL('/locations',origin).href,lastModified:new Date(Math.max(...eligible.map(item=>Date.parse(item.modifiedAt))))},...eligible.map(item=>({url:new URL(item.path,origin).href,lastModified:new Date(item.modifiedAt)}))];
}
