import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectMicePage} from './mice-page.ts';
import {resolveMiceForms} from './mice-form-resolution.ts';
import {enquiryHttpConfig} from './enquiry-runtime.ts';
import {createEnquiryRpc} from './enquiry-database.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
const uuid=z.string().uuid();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('page'),path:z.literal('/mice'),locale:z.literal('en'),payload:z.record(z.string(),z.unknown())}).strict();
export function usesCmsMice(env:Record<string,string|undefined>=process.env){return env.CMS_MICE_DELIVERY_ENABLED==='true';}
export function parsePublicMice(input:unknown,site:string,now=new Date()){
 const value=envelope.parse(input);if(value.websiteId!==uuid.parse(site))throw Error('Published MICE website mismatch.');
 return projectMicePage({recordId:value.recordId,revisionId:value.revisionId,type:value.type,payload:value.payload},{locale:value.locale,now});
}
/** Server-only published loader. No editor, legacy, or cached eligibility fallback.
 * Private form definitions are used only for compatibility checks, never returned. */
export async function readPublishedMice(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsMice(env))return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!env.CMS_TURNSTILE_SITE_KEY||!enquiryHttpConfig(env,fetcher)||!Number.isFinite(now.getTime()))throw Error('Published MICE and corporate enquiry intake are not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const formRpc=createEnquiryRpc({url:env.CMS_SUPABASE_URL,serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher);
 const read=()=>cmsRpc(connection,connection.key,'get_public_mice',{p_site:site,p_locale:'en'},fetcher);
 const readForm=(website:string,id:string)=>formRpc('get_published_form',{p_site:website,p_form:id});
 const seoReader=seoSettingsReader(env,fetcher),raw=await read();if(raw===null)return null;
 const page=parsePublicMice(raw,site,now);
 const forms=await resolveMiceForms(page,site,readForm),settings=await readPublishedSeoSettings(site,'en',seoReader);
 if(!settings)throw Error('Published MICE SEO defaults are unavailable.');
 const latest=await read();if(latest===null)throw Error('Published MICE changed while loading. Reload it.');
 const latestPage=parsePublicMice(latest,site,now);
 const [latestForms,latestSettings]=await Promise.all([resolveMiceForms(latestPage,site,readForm),readPublishedSeoSettings(site,'en',seoReader)]);
 if(JSON.stringify(latestPage)!==JSON.stringify(page)||JSON.stringify(latestForms)!==JSON.stringify(forms)||JSON.stringify(latestSettings)!==JSON.stringify(settings))throw Error('Published MICE, corporate form or SEO settings changed while loading. Reload it.');
 return {content:{page},forms,seoDefaults:settings.seo};
}
