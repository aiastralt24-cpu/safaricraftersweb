import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {usesCmsCustomPages} from './custom-page-runtime.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
import type {GlobalSettings} from './global-settings.ts';
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().refine(isCustomPagePath),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),seo:pageSeoSchema.nullable().transform(value=>value??newPageSeo())}).strict();
export type CustomPageSummary=z.infer<typeof summary>;
export async function readCustomPageSummaries(read:(after:string|null)=>Promise<unknown>){
 let after:string|null=null;const result:CustomPageSummary[]=[],paths=new Set<string>();
 for(let page=0;page<100;page++){
  const batch=z.array(summary).max(100).parse(await read(after));
  for(const row of batch){if(after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid custom page pagination.');after=row.recordId;paths.add(row.path);result.push(row);}
  if(batch.length<100)return result;
 }
 throw Error('Custom page catalogue exceeds the configured delivery limit.');
}
export async function loadCustomPageDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(!usesCmsCustomPages(env))return null;
 const settings=await readPublishedSeoSettings(env.CMS_WEBSITE_ID!,'en',seoSettingsReader(env,fetcher));if(!settings)throw Error('Published custom page SEO defaults are unavailable.');
 const connection={url:env.CMS_SUPABASE_URL!,key:env.CMS_SUPABASE_ANON_KEY!};
 const items=await readCustomPageSummaries(after=>cmsRpc(connection,connection.key,'list_published_custom_pages',{p_site:env.CMS_WEBSITE_ID,p_locale:'en',p_after:after,p_limit:100},fetcher));
 return {items,seoDefaults:settings.seo};
}
export function customPageSitemapItems(items:CustomPageSummary[],defaults:GlobalSettings['seo'],origin:string){
 return items.filter(item=>resolveSeoDefaults(item.seo,defaults,{origin,path:item.path,title:item.title}).sitemap.value).map(item=>({url:new URL(item.path,origin).href,lastModified:new Date(item.modifiedAt)}));
}

export function customPageSearchItems(items:CustomPageSummary[],defaults:GlobalSettings['seo'],origin:string){
 return items.filter(item=>resolveSeoDefaults(item.seo,defaults,{origin,path:item.path,title:item.title}).indexing.value!=='noindex').map(item=>({title:item.title,href:item.path,type:'Page' as const,detail:item.seo.description||undefined}));
}
