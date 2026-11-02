import {z} from 'zod';
import {globalSettingsSchema} from './global-settings.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const published=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,seo:globalSettingsSchema.shape.seo}).strict();
export type PublishedSeoSettings=z.infer<typeof published>;
export type SeoSettingsReader=(site:string,locale:string)=>Promise<unknown>;
/** No implicit default language or draft fallback for missing published settings. */
export async function readPublishedSeoSettings(site:string,locale:string,read:SeoSettingsReader):Promise<PublishedSeoSettings|null>{
 uuid.parse(site);
 language.parse(locale);
 const result=await read(site,locale);
 if(result===null)return null;
 const value=published.parse(result);
 if(value.websiteId!==site||value.locale!==locale)throw Error('Published SEO settings identity mismatch.');
 return value;
}
export function seoSettingsReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):SeoSettingsReader{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published SEO settings are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return (site,locale)=>{
  if(site!==env.CMS_WEBSITE_ID||!language.safeParse(locale).success)throw Error('Published SEO settings identity mismatch.');
  return cmsRpc(config,config.key,'get_public_seo_settings',{p_site:site,p_locale:locale},fetcher);
 };
}
