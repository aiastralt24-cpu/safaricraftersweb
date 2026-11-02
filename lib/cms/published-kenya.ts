import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectKenyaPage} from './kenya-page.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
const uuid=z.string().uuid();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('page'),path:z.literal('/destinations/kenya'),locale:z.literal('en'),payload:z.record(z.string(),z.unknown())}).strict();
export function usesCmsKenya(env:Record<string,string|undefined>=process.env){return env.CMS_KENYA_DELIVERY_ENABLED==='true';}
export function parsePublicKenya(input:unknown,site:string,now=new Date()){
 const value=envelope.parse(input);if(value.websiteId!==uuid.parse(site))throw Error('Published Kenya website mismatch.');
 return projectKenyaPage({recordId:value.recordId,revisionId:value.revisionId,type:value.type,payload:value.payload},{locale:value.locale,now});
}
/** Published-only loader: no editor, legacy or cached eligibility fallback. */
export async function readPublishedKenya(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsKenya(env))return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!Number.isFinite(now.getTime()))throw Error('Published Kenya delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const read=()=>cmsRpc(connection,connection.key,'get_public_kenya',{p_site:site,p_locale:'en'},fetcher);
 const readSeo=()=>readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher));
 const raw=await read();if(raw===null)return null;
 const page=parsePublicKenya(raw,site,now),settings=await readSeo();if(!settings)throw Error('Published Kenya SEO defaults are unavailable.');
 const [latest,latestSettings]=await Promise.all([read(),readSeo()]);
 if(latest===null||JSON.stringify(parsePublicKenya(latest,site,now))!==JSON.stringify(page)||JSON.stringify(latestSettings)!==JSON.stringify(settings))throw Error('Published Kenya or SEO settings changed while loading. Reload it.');
 return {content:{page},seoDefaults:settings.seo};
}
