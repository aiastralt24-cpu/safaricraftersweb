import {usesCmsProjects} from './project-route.ts';
import {publicProjectConfig,readPublishedProjects} from './public-project-runtime.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import type {GlobalSettings} from './global-settings.ts';
type Items=Awaited<ReturnType<typeof readPublishedProjects>>;
const fallback:GlobalSettings['seo']={titleTemplate:'%s',description:'',indexing:'index'};
export async function loadProjectDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){if(!usesCmsProjects(env))return null;return readPublishedProjects(publicProjectConfig(env,fetcher));}
function resolved(item:Items[number],defaults:GlobalSettings['seo']|undefined,origin:string){return resolveSeoDefaults(item.seo,defaults??fallback,{origin,path:item.path,title:item.title});}
export function projectSearchItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return items.filter(item=>{const seo=resolved(item,defaults,origin);return seo.indexing.value!=='noindex'&&seo.canonical.value===new URL(item.path,origin).href;}).map(item=>({title:item.title,href:item.path,type:'Project' as const,detail:item.industry|| (item.kind==='caseStudy'?'Case study':'Project'),searchText:item.summary}));
}
export function projectSitemapItems(items:Items,defaults?:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const eligible=items.filter(item=>resolved(item,defaults,origin).sitemap.value);if(!eligible.length)return [];
 return [{url:new URL('/projects',origin).href,lastModified:new Date(Math.max(...eligible.map(item=>Date.parse(item.modifiedAt))))},...eligible.map(item=>({url:new URL(item.path,origin).href,lastModified:new Date(item.modifiedAt)}))];
}
