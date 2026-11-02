import {z} from 'zod';
import {projectGuidedSafarisPage} from './guided-safaris-page.ts';
import {cmsRpc} from './gateway.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
const uuid=z.string().uuid();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('page'),path:z.literal('/guided-bespoke-safaris'),locale:z.literal('en'),payload:z.record(z.string(),z.unknown())}).strict();
export function parsePublicGuided(input:unknown,site:string,now=new Date()){
 const value=envelope.parse(input);if(value.websiteId!==uuid.parse(site))throw Error('Published Bespoke website mismatch.');
 return projectGuidedSafarisPage({recordId:value.recordId,revisionId:value.revisionId,type:value.type,payload:value.payload},{locale:value.locale,now});
}
export function usesCmsGuided(env:Record<string,string|undefined>=process.env){return env.CMS_GUIDED_DELIVERY_ENABLED==='true';}
/** Public RPC only. Missing published content never falls back to editor data. */
export async function readPublishedGuided(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsGuided(env))return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!Number.isFinite(now.getTime()))throw Error('Published Bespoke is not configured.');
 const site=env.CMS_WEBSITE_ID!,config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const read=()=>cmsRpc(config,config.key,'get_public_guided',{p_site:site,p_locale:'en'},fetcher);
 const raw=await read();if(raw===null)return null;
 const page=parsePublicGuided(raw,site,now),settings=await readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher));
 if(!settings)throw Error('Published Bespoke SEO defaults are unavailable.');
 const [latest,latestSettings]=await Promise.all([read(),readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher))]);
 if(latest===null||JSON.stringify(parsePublicGuided(latest,site,now))!==JSON.stringify(page)||JSON.stringify(latestSettings)!==JSON.stringify(settings))throw Error('Published Bespoke or SEO settings changed while loading. Reload it.');
 return {content:{page},seoDefaults:settings.seo};
}
