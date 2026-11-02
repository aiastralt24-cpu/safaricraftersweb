import {z} from 'zod';
import {globalSettingsSchema} from './global-settings.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,payload:globalSettingsSchema}).strict();
export type PublishedSettings=z.infer<typeof envelope>;
export async function readPublishedSettings(site:string,locale:string,read:(site:string,locale:string)=>Promise<unknown>):Promise<PublishedSettings|null>{
 uuid.parse(site);language.parse(locale);
 const input=await read(site,locale);if(input===null)return null;
 const result=envelope.parse(input);
 if(result.websiteId!==site||result.locale!==locale)throw Error('Published settings identity mismatch.');
 return result;
}
export function settingsReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published settings are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return (site:string,locale:string)=>{
  if(site!==env.CMS_WEBSITE_ID||!language.safeParse(locale).success)throw Error('Published settings identity mismatch.');
  return cmsRpc(config,config.key,'get_public_settings',{p_site:site,p_locale:locale},fetcher);
 };
}
