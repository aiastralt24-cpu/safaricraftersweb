import type {GlobalSettings} from './global-settings.ts';
import {readPublicLanguageVariants} from './public-language-variants.ts';
export async function pageLanguageLinks(page:{recordId:string;revisionId:string;locale:string;path:string},settings:GlobalSettings['header']|undefined,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true'||!settings?.languageSelector)return null;
 const label=settings.languageSelectorLabel?.trim();
 if(!label)throw Error('Published language selector label is unavailable.');
 const variants=await readPublicLanguageVariants({site:env.CMS_WEBSITE_ID??'',record:page.recordId,revision:page.revisionId,locale:page.locale},env,fetcher);
 if(!variants||variants.length<2||!variants.some(row=>row.locale===page.locale&&row.href===page.path))return null;
 return {label,links:variants.map(row=>({locale:row.locale,href:row.href,current:row.locale===page.locale,label:new Intl.DisplayNames([row.locale],{type:'language',fallback:'code'}).of(row.locale)??row.locale}))};
}
