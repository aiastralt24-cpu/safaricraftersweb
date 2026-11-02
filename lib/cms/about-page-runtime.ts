import {leadershipReferenceReader,readLeadershipReferences} from './leadership-references.ts';
import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectAboutPage} from './about-page.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
export function usesCmsAbout(env:Record<string,string|undefined>=process.env){return env.CMS_ABOUT_PAGE_ENABLED==='true';}
export async function loadAboutRoute(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!usesCmsAbout(env)||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('About page delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const [input,settings]=await Promise.all([cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:'/about',p_locale:'en'},fetcher),readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher))]);
 if(input===null)return null;if(!settings)throw Error('Published About SEO defaults are unavailable.');
 const page=projectAboutPage(input,{locale:'en',now});
 const sections=page.sections.filter(section=>section.kind==='reusableLeadership');
 const profiles=await readLeadershipReferences([...new Set(sections.flatMap(section=>section.data.records.map(ref=>ref.recordId.toLowerCase())))],leadershipReferenceReader(env,fetcher));
 const leadershipProfiles=Object.fromEntries(sections.map(section=>[section.id,section.data.records.flatMap(ref=>profiles.filter(profile=>profile.recordId===ref.recordId.toLowerCase()))]));
 return {page,leadershipProfiles,seoDefaults:settings.seo};
}
