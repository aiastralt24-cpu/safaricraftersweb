import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {legalPathSchema,projectLegalPage,type LegalPath} from './legal-page.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
export function usesCmsLegalPages(env:Record<string,string|undefined>=process.env){return env.CMS_LEGAL_PAGES_ENABLED==='true';}
export async function loadLegalRoute(path:LegalPath,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 legalPathSchema.parse(path);
 if(!usesCmsLegalPages(env)||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Legal page delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const [input,settings]=await Promise.all([cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:path,p_locale:'en'},fetcher),readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher))]);
 if(input===null)return null;
 if(!settings)throw Error('Published legal SEO defaults are unavailable.');
 return {page:projectLegalPage(input,path,{locale:'en',now}),seoDefaults:settings.seo};
}
