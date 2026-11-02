import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
/** Opt-in while the remaining legacy metadata consumers are migrated. */
export async function readSeoDefaults(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_SEO_SETTINGS_ENABLED!=='true')return undefined;
 const settings=await readPublishedSeoSettings(env.CMS_WEBSITE_ID!,'en',seoSettingsReader(env,fetcher));
 if(!settings)throw Error('Published SEO settings are unavailable.');
 return settings.seo;
}
