import {cmsRpc} from './gateway.ts';
import type {PublicPageConfig} from './public-page.ts';
/** Public reader uses only the anon key and the narrow published-page RPC. */
export function publicPageConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicPageConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!env.CMS_WEBSITE_ID||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site:env.CMS_WEBSITE_ID,read:async(site,path,locale)=>cmsRpc(config,config.key,'get_public_page',{p_site:site,p_path:path,p_locale:locale},fetcher)};
}
