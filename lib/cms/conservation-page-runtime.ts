import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectConservationPage} from './conservation-page.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
export function usesCmsConservation(env:Record<string,string|undefined>=process.env){return env.CMS_CONSERVATION_PAGE_ENABLED==='true';}
/** Rollout-gated published reads. Never substitutes draft data or legacy content on failure. */
export async function loadConservationRoute(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsConservation(env)||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Conservation page delivery is not configured.');
 if(!Number.isFinite(now.getTime()))throw Error('Conservation delivery needs a valid server time.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const input=await cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:'/conservation-commitment',p_locale:'en'},fetcher);
 if(input===null)return null;
 const page=projectConservationPage(input,{locale:'en',now});
 const settings=await readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher));
 if(!settings)throw Error('Published conservation SEO defaults are unavailable.');
 return {page,seoDefaults:settings.seo};
}
