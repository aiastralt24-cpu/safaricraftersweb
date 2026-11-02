import {leadershipReferenceReader,readLeadershipReferences} from './leadership-references.ts';
import {publicFaqReader,readPublishedFaqs} from './public-faq-runtime.ts';
import {z} from 'zod';
import {readPublishedSettings,settingsReader} from './public-settings.ts';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {projectCustomPage} from './custom-page.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
export function usesCmsCustomPages(env:Record<string,string|undefined>=process.env){return env.CMS_CUSTOM_PAGES_ENABLED==='true';}
export async function loadCustomPageRoute(path:string,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(!isCustomPagePath(path)||!usesCmsCustomPages(env))return null;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Custom page delivery is not configured.');
 const site=env.CMS_WEBSITE_ID!,connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const input=await cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:path,p_locale:'en'},fetcher);
 if(input===null)return null;
 const settings=await readPublishedSeoSettings(site,'en',seoSettingsReader(env,fetcher));if(!settings)throw Error('Published custom page SEO defaults are unavailable.');
 let selectorSettings;
 if(env.CMS_LOCALIZED_PAGES_ENABLED==='true'){
  const snapshot=await readPublishedSettings(site,'en',settingsReader(env,fetcher));
  if(!snapshot||snapshot.recordId!==settings.recordId||snapshot.revisionId!==settings.revisionId)throw Error('Page language settings publication changed. Reload before rendering.');
  selectorSettings=snapshot.payload.header;
 }
 const page=projectCustomPage(input,path,{locale:'en',now});
 const faqAnswers:Record<string,Awaited<ReturnType<typeof readPublishedFaqs>>>={};
 const faqSections=page.sections.filter(section=>section.kind==='reusableFaq');
 const answers=await readPublishedFaqs([...new Set(faqSections.flatMap(section=>section.data.records.map(r=>r.recordId)))],publicFaqReader(env,fetcher));
 for(const section of faqSections)faqAnswers[section.id]=section.data.records.flatMap(ref=>answers.filter(answer=>answer.recordId===ref.recordId.toLowerCase()));
 const leadershipProfiles:Record<string,Awaited<ReturnType<typeof readLeadershipReferences>>>={};
 const leadershipSections=page.sections.filter(section=>section.kind==='reusableLeadership');
 const profiles=await readLeadershipReferences([...new Set(leadershipSections.flatMap(section=>section.data.records.map(r=>r.recordId.toLowerCase())))],leadershipReferenceReader(env,fetcher));
 for(const section of leadershipSections)leadershipProfiles[section.id]=section.data.records.flatMap(ref=>profiles.filter(profile=>profile.recordId===ref.recordId.toLowerCase()));
 return {page,leadershipProfiles,faqAnswers,seoDefaults:settings.seo,selectorSettings};
}
