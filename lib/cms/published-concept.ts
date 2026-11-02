import {z} from 'zod';
import {sectionDataSchemas} from './composition.ts';
import {pageSeoSchema} from './page-seo.ts';
import {cmsRpc} from './gateway.ts';
import {resolveConceptDependencies} from './concept-dependencies.ts';
import {homepagePublishedReaders} from './homepage-published-readers.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
import {conceptNavigationSchema} from './concept-navigation.ts';
const uuid=z.string().uuid();
const publicStory=sectionDataSchemas.homepageStory.extend({statistics:z.array(sectionDataSchemas.homepageStory.shape.statistics.element.omit({source:true})).min(1).max(12)});
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('page'),path:z.literal('/concept'),locale:z.literal('en'),payload:z.object({composition:z.object({schemaVersion:z.literal(1),title:z.string(),sections:z.array(z.object({id:z.string(),kind:z.string(),controls:z.record(z.string(),z.unknown()),data:z.unknown()}).strict()).max(100)}).strict(),seo:pageSeoSchema.optional(),navigation:conceptNavigationSchema}).strict()}).strict();
/** Public statistics deliberately lack evidence. The blank value below exists
 * only to reuse composition shape parsing; it never certifies a draft or consent. */
export function parsePublicConceptInput(input:unknown,site:string){
 const value=envelope.parse(input);if(value.websiteId!==uuid.parse(site))throw Error('Published Concept website mismatch.');
 const sections=value.payload.composition.sections.map(section=>{
  if(section.kind!=='homepageStory')return section;
  const data=publicStory.parse(section.data);
  return {...section,data:{...data,statistics:data.statistics.map(stat=>({...stat,source:''}))}};
 });
 return {recordId:value.recordId,revisionId:value.revisionId,type:value.type,payload:{...value.payload,composition:{...value.payload.composition,sections}}};
}

export function usesCmsConcept(env:Record<string,string|undefined>=process.env){return env.CMS_CONCEPT_DELIVERY_ENABLED==='true';}

/** Delivery contract only: the public RPC, release guards and route rollout must
 * be connected before enabling this reader. Never reads editor records. */
export async function readPublishedConcept(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsConcept(env))return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!Number.isFinite(now.getTime()))throw Error('Published Concept is not configured.');
 const site=env.CMS_WEBSITE_ID!,config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const raw=await cmsRpc(config,config.key,'get_public_concept',{p_site:site,p_locale:'en'},fetcher);
 if(raw===null)return null;
 const input=parsePublicConceptInput(raw,site);
 const [content,settings]=await Promise.all([
  resolveConceptDependencies(input,site,{locale:'en',now},homepagePublishedReaders(env,fetcher)),
  readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher)),
 ]);
 if(!settings)throw Error('Published Concept SEO defaults are unavailable.');
 const [latest,latestSettings]=await Promise.all([
  cmsRpc(config,config.key,'get_public_concept',{p_site:site,p_locale:'en'},fetcher),
  readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher)),
 ]);
 if(latest===null||JSON.stringify(parsePublicConceptInput(latest,site))!==JSON.stringify(input)||JSON.stringify(latestSettings)!==JSON.stringify(settings))throw Error('Published Concept or SEO settings changed while loading. Reload it.');
 return {content,seoDefaults:settings.seo};
}
