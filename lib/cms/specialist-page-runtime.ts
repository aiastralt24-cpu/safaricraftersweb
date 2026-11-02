import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {specialistDirectoryReader} from './public-specialists.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
import {readPublishedSpecialistPage} from './specialist-page.ts';
import type {SpecialistPageConfig} from './specialist-page.ts';

export function usesCmsSpecialists(env:Record<string,string|undefined>=process.env){return env.CMS_SPECIALISTS_DELIVERY_ENABLED==='true';}
export function specialistPageConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):SpecialistPageConfig|null{
 if(!usesCmsSpecialists(env))return null;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Specialist page delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site,readDirectory:specialistDirectoryReader(env,fetcher),readPage:(requestedSite,path,locale)=>{
  if(requestedSite!==site||path!=='/specialists'||locale!=='en')throw Error('Specialist page identity mismatch.');
  return cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:'/specialists',p_locale:'en'},fetcher);
 }};
}
/** One request-scoped result serves both metadata and page content in the route. */
export async function loadSpecialistRoute(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 const config=specialistPageConfig(env,fetcher);
 if(!config)throw Error('Specialist page delivery is disabled.');
 const [content,settings]=await Promise.all([
  readPublishedSpecialistPage(config,{locale:'en',now}),
  readPublishedSeoSettings(config.site,'en',seoSettingsReader(env,fetcher)),
 ]);
 if(!content)return null;
 if(!settings)throw Error('Published specialist SEO defaults are unavailable.');
 return {...content,seoDefaults:settings.seo};
}
