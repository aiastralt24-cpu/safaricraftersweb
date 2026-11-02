import {usesCmsApplication} from './public-application-runtime.ts';
import {publicApplicationConfig,readPublishedApplicationList} from './public-application-runtime.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import type {GlobalSettings} from './global-settings.ts';
type Items=Awaited<ReturnType<typeof readPublishedApplicationList>>;
const fallback:GlobalSettings['seo']={titleTemplate:'%s',description:'',indexing:'index'};
export async function loadApplicationDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){if(!usesCmsApplication(env))return null;const config=publicApplicationConfig(env,fetcher);const lists=await Promise.all([readPublishedApplicationList(config,'application'),readPublishedApplicationList(config,'industry')]);const items=lists.flat(),ids=new Set<string>(),paths=new Set<string>();for(const item of items){if(ids.has(item.recordId)||paths.has(item.path))throw Error('Duplicate application discovery identity.');ids.add(item.recordId);paths.add(item.path);}return items;}
function resolved(item:Items[number],defaults:GlobalSettings['seo']|undefined,origin:string){return resolveSeoDefaults(item.seo,defaults??fallback,{origin,path:item.path,title:item.title});}
export function applicationSearchItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return items.filter(item=>{const seo=resolved(item,defaults,origin);return seo.indexing.value!=='noindex'&&seo.canonical.value===new URL(item.path,origin).href;}).map(item=>({title:item.title,href:item.path,type:'Application' as const,detail:item.kind==='industry'?'Industry':'Application',searchText:item.summary}));
}
export function applicationSitemapItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const eligible=items.filter(item=>resolved(item,defaults,origin).sitemap.value);if(!eligible.length)return [];
 const directories=(['application','industry'] as const).flatMap(kind=>{const rows=eligible.filter(item=>item.kind===kind);return rows.length?[{url:new URL(kind==='industry'?'/industries':'/applications',origin).href,lastModified:new Date(Math.max(...rows.map(item=>Date.parse(item.modifiedAt))))}]:[];});
 return [...directories,...eligible.map(item=>({url:new URL(item.path,origin).href,lastModified:new Date(item.modifiedAt)}))];
}
