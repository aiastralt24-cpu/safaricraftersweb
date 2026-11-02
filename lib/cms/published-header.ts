import {interfaceTextForLocale} from './interface-text.ts';
import {navigationLinkForLocale,type LocalizedRouteResolver} from './localized-navigation-link.ts';
import {z} from 'zod';
import {globalSettingsSchema} from './global-settings.ts';
import {projectPublishedNavigation} from './published-navigation.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const reference=z.discriminatedUnion('available',[
 z.object({recordId:uuid,available:z.literal(false)}).strict(),
 z.object({recordId:uuid,available:z.literal(true),type:z.enum(['journey','destination','journalArticle']),title:z.string().trim().min(1).max(200),path:z.string(),locale:language}).strict(),
]);
const envelope=z.object({settings:z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,payload:globalSettingsSchema}).strict(),menus:z.object({mainMenu:z.unknown(),utilityMenu:z.unknown(),mobileMenu:z.unknown()}).strict(),featured:z.array(reference).max(12)}).strict();
export function projectPublishedHeader(input:unknown,site:string,now:Date,options:{requireAvailableReferences?:boolean;locale?:string;resolveLocalizedRoute?:LocalizedRouteResolver}={}){
 const value=envelope.parse(input),settings=value.settings;
 const locale=language.parse(options.locale??'en');
 if(settings.locale!==locale)throw Error('Published header language mismatch.');
 if(locale!=='en'&&!options.resolveLocalizedRoute)throw Error('Localized navigation requires verified route resolution.');
 if(settings.websiteId!==uuid.parse(site))throw Error('Published header website mismatch.');
 const {brand,header}=settings.payload;
 const interfaceText=interfaceTextForLocale(settings.payload.interfaceText,locale,brand.name);
 const homeHref=navigationLinkForLocale(interfaceText.homeHref,locale,options.resolveLocalizedRoute);
 if(header.languageSelector&&!header.languageSelectorLabel?.trim())throw Error('Published language selection requires an explicit localized route selector label.');
 if(!header.mainMenu)throw Error('Published header requires a main menu.');
 const resolve=(name:'mainMenu'|'utilityMenu'|'mobileMenu')=>{
  const ref=header[name],menu=value.menus[name];
  if(!ref){if(menu!==null)throw Error('Unexpected published header menu.');return null;}
  if(menu===null||menu===undefined)throw Error('Published header menu is unavailable.');
  return projectPublishedNavigation(menu,{site,record:ref.recordId,locale:settings.locale},{now,requireAvailableReferences:options.requireAvailableReferences,resolveLocalizedRoute:options.resolveLocalizedRoute});
 };
 const main=resolve('mainMenu')!,utility=resolve('utilityMenu'),mobile=resolve('mobileMenu');
 const ids=new Set(header.featuredContent.map(ref=>ref.recordId)),byId=new Map(value.featured.map(ref=>[ref.recordId,ref]));
 if(ids.size!==header.featuredContent.length||byId.size!==value.featured.length||ids.size!==byId.size||[...ids].some(id=>!byId.has(id)))throw Error('Published header featured reference mismatch.');
 if(options.requireAvailableReferences&&value.featured.some(ref=>!ref.available))throw Error('Published header dependencies are unavailable.');
 const featured=header.featuredContent.flatMap(ref=>{const record=byId.get(ref.recordId)!;if(!record.available)return [];
  const prefix={journey:'journeys',destination:'destinations',journalArticle:'journal'}[record.type];
  if(record.locale!==locale||!new RegExp(`^/${prefix}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(record.path))throw Error('Published header featured route mismatch.');
  return [{recordId:record.recordId,title:record.title,href:navigationLinkForLocale(record.path,locale,options.resolveLocalizedRoute)}];
 });
 return {revisionId:settings.revisionId,locale,interfaceText:{...interfaceText,homeHref},brand,variant:header.variant,sticky:header.sticky,languageSelector:header.languageSelector,cta:header.cta?{...header.cta,href:navigationLinkForLocale(header.cta.href,locale,options.resolveLocalizedRoute)}:undefined,main,utility,mobile:mobile??main,featured};
}
export type PublishedHeader=ReturnType<typeof projectPublishedHeader>;
export async function readPublishedHeaderSnapshot(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date(),options:{locale?:string;resolveLocalizedRoute?:LocalizedRouteResolver}={}){
 if(env.CMS_HEADER_SETTINGS_ENABLED!=='true')return undefined;
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published header is not configured.');
 const locale=language.parse(options.locale??'en');
 if(locale!=='en'&&!options.resolveLocalizedRoute)throw Error('Localized navigation requires verified route resolution.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 const response=await cmsRpc(config,config.key,'get_public_header',{p_site:env.CMS_WEBSITE_ID,p_locale:locale},fetcher);
 if(response===null)throw Error('Published header is unavailable.');
 return {header:projectPublishedHeader(response,env.CMS_WEBSITE_ID!,now,options),seoDefaults:envelope.parse(response).settings.payload.seo};
}

/** Shared surfaces only need navigation; homepage metadata uses the full snapshot. */
export async function readPublishedHeader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date(),options:{locale?:string;resolveLocalizedRoute?:LocalizedRouteResolver}={}):Promise<PublishedHeader|undefined>{
 return (await readPublishedHeaderSnapshot(env,fetcher,now,options))?.header;
}
