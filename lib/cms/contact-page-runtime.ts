import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectContactPage} from './contact-page.ts';
import {resolveContactForms} from './contact-form-resolution.ts';
import {enquiryHttpConfig} from './enquiry-runtime.ts';
import {createEnquiryRpc} from './enquiry-database.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
export function usesCmsContact(env:Record<string,string|undefined>=process.env){return env.CMS_CONTACT_PAGE_ENABLED==='true';}
/** Published-only server loader. Recheck all form dependencies on each request,
 * including forms withdrawn after the page was released. */
export async function loadContactRoute(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsContact(env)||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!env.CMS_TURNSTILE_SITE_KEY||!enquiryHttpConfig(env,fetcher))throw Error('Contact delivery and enquiry intake are not configured.');
 if(!Number.isFinite(now.getTime()))throw Error('Contact delivery needs a valid server time.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const readForm=createEnquiryRpc({url:env.CMS_SUPABASE_URL,serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher);
 const input=await cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:'/contact',p_locale:'en'},fetcher);
 if(input===null)return null;
 const page=projectContactPage(input,{locale:'en',now});
 const forms=await resolveContactForms(page,site,(website,formId)=>readForm('get_published_form',{p_site:website,p_form:formId}));
 const settings=await readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher));
 if(!settings)throw Error('Published contact SEO defaults are unavailable.');
 return {page,forms,seoDefaults:settings.seo};
}
