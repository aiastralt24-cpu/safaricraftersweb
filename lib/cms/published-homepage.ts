import {z} from 'zod';
import {sectionDataSchemas} from './composition.ts';
import {pageSeoSchema} from './page-seo.ts';
import {cmsRpc} from './gateway.ts';
import {resolveHomepageDependencies} from './homepage-dependencies.ts';
import {homepagePublishedReaders} from './homepage-published-readers.ts';
import {readPublishedHeaderSnapshot} from './published-header.ts';
const uuid=z.string().uuid();
const publicStory=sectionDataSchemas.homepageStory.extend({statistics:z.array(sectionDataSchemas.homepageStory.shape.statistics.element.omit({source:true})).min(1).max(12)});
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('homepage'),payload:z.object({composition:z.object({schemaVersion:z.literal(1),title:z.string(),sections:z.array(z.object({id:z.string(),kind:z.string(),controls:z.record(z.string(),z.unknown()),data:z.unknown()}).strict()).max(100)}).strict(),seo:pageSeoSchema.optional()}).strict()}).strict();
/** Public statistics deliberately lack evidence. The blank value below exists
 * only to reuse composition shape parsing; it never certifies a draft or consent. */
export function parsePublicHomepageInput(input:unknown,site:string){
 const value=envelope.parse(input);if(value.websiteId!==uuid.parse(site))throw Error('Published homepage website mismatch.');
 const sections=value.payload.composition.sections.map(section=>{
  if(section.kind!=='homepageStory')return section;
  const data=publicStory.parse(section.data);
  return {...section,data:{...data,statistics:data.statistics.map(stat=>({...stat,source:''}))}};
 });
 return {recordId:value.recordId,revisionId:value.revisionId,type:value.type,payload:{...value.payload,composition:{...value.payload.composition,sections}}};
}
export async function readPublishedHomepage(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(env.CMS_HOMEPAGE_DELIVERY_ENABLED!=='true')return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published homepage is not configured.');
 const site=env.CMS_WEBSITE_ID!,config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const raw=await cmsRpc(config,config.key,'get_public_homepage',{p_site:site,p_locale:'en'},fetcher);
 if(raw===null)throw Error('Published homepage is unavailable.');
 const input=parsePublicHomepageInput(raw,site);
 const [content,headerSnapshot]=await Promise.all([resolveHomepageDependencies(input,site,{locale:'en',now},homepagePublishedReaders(env,fetcher)),readPublishedHeaderSnapshot(env,fetcher,now)]);
 if(!headerSnapshot)throw Error('Published homepage requires configured header delivery.');
 // Dependency reads take time. Reject a concurrent homepage/header replacement
 // or withdrawal rather than returning a mixed old/new presentation.
 const [latestRaw,latestHeader]=await Promise.all([
  cmsRpc(config,config.key,'get_public_homepage',{p_site:site,p_locale:'en'},fetcher),
  readPublishedHeaderSnapshot(env,fetcher,now),
 ]);
 if(latestRaw===null||JSON.stringify(parsePublicHomepageInput(latestRaw,site))!==JSON.stringify(input)||JSON.stringify(latestHeader)!==JSON.stringify(headerSnapshot))throw Error('Published homepage or navigation changed while loading. Reload it.');
 return {content,header:headerSnapshot.header,seoDefaults:headerSnapshot.seoDefaults};
}
