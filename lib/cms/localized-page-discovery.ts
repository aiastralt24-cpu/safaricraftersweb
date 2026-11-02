import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {localizedPageHref} from './localized-routes.ts';
import {globalSettingsSchema} from './global-settings.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
import {resolveSeoDefaults} from './seo-resolution.ts';
const uuid=z.string().uuid();
const summary=z.object({recordId:uuid,revisionId:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).refine(value=>value!=='en'),path:z.string().refine(isCustomPagePath),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),seo:pageSeoSchema.nullable().transform(value=>value??newPageSeo()),seoDefaults:globalSettingsSchema.shape.seo}).strict();
const envelope=z.object({websiteId:uuid,items:z.array(summary).max(100)}).strict();
export type LocalizedPageSummary=z.infer<typeof summary>;
export async function readLocalizedPageSummaries(site:string,read:(after:string|null)=>Promise<unknown>){
 uuid.parse(site);let after:string|null=null;const items:LocalizedPageSummary[]=[],paths=new Set<string>();
 for(let batch=0;batch<100;batch++){
  const value=envelope.parse(await read(after));
  if(value.websiteId!==site)throw Error('Localized catalogue website mismatch.');
  for(const row of value.items){
   const path=localizedPageHref(row.locale,row.path);
   if(after!==null&&row.recordId<=after||paths.has(path))throw Error('Invalid localized catalogue pagination.');
   after=row.recordId;paths.add(path);items.push(row);
  }
  if(value.items.length<100)return items;
 }
 throw Error('Localized catalogue exceeds the configured delivery limit.');
}
export async function loadLocalizedPageDiscovery(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return [];
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_CUSTOM_PAGES_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Localized catalogue is not configured.');
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return readLocalizedPageSummaries(env.CMS_WEBSITE_ID!,after=>cmsRpc(connection,connection.key,'list_published_localized_pages',{p_site:env.CMS_WEBSITE_ID,p_after:after,p_limit:100},fetcher));
}
export function localizedPageSitemapItems(items:LocalizedPageSummary[],origin:string){
 return items.flatMap(item=>{
  const path=localizedPageHref(item.locale,item.path);
  return resolveSeoDefaults(item.seo,item.seoDefaults,{origin,path,title:item.title}).sitemap.value?[{url:new URL(path,origin).href,lastModified:new Date(item.modifiedAt)}]:[];
 });
}
