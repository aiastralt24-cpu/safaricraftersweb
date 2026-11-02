import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {expeditionDirectoryReader} from './public-expedition-directory.ts';
import {usesCmsExpedition} from './expedition-route.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
import {readPublishedExpeditionPage} from './expedition-page.ts';
import type {ExpeditionPageConfig} from './expedition-page.ts';

export function expeditionPageConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ExpeditionPageConfig|null{
 if(!usesCmsExpedition(env))return null;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Expedition page delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site,readDirectory:expeditionDirectoryReader(env,fetcher),readPage:(requestedSite,path,locale)=>{
  if(requestedSite!==site||path!=='/photo-expeditions'||locale!=='en')throw Error('Expedition page identity mismatch.');
  return cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:'/photo-expeditions',p_locale:'en'},fetcher);
 }};
}
/** One request-scoped result serves both metadata and page content in the route. */
export async function loadExpeditionRoute(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 const config=expeditionPageConfig(env,fetcher);
 if(!config)throw Error('Expedition page delivery is disabled.');
 const [content,settings]=await Promise.all([
  readPublishedExpeditionPage(config,{locale:'en',now}),
  readPublishedSeoSettings(config.site,'en',seoSettingsReader(env,fetcher)),
 ]);
 if(!content)return null;
 if(!settings)throw Error('Published expedition SEO defaults are unavailable.');
 return {...content,today:now.toISOString().slice(0,10),seoDefaults:settings.seo};
}
