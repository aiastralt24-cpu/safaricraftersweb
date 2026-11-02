import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {readPublishedSettings} from './public-settings.ts';
import {projectPublishedHeader} from './published-header.ts';
import {readLocalizedRoutes,localizedRoutesReader} from './localized-routes.ts';
import {navigationLinkForLocale,type LocalizedRouteResolver} from './localized-navigation-link.ts';
import {publicNavigationHosts} from './navigation-routes.ts';
import type {GlobalSettings} from './global-settings.ts';

/** Collect candidates only; the registry independently decides whether each can be delivered. */
function routeCandidates(value:unknown):string[]{
 if(Array.isArray(value))return value.flatMap(routeCandidates);
 if(!value||typeof value!=='object')return [];
 return Object.entries(value).flatMap(([key,child])=>{
  if(!['href','homeHref','path'].includes(key)||typeof child!=='string')return routeCandidates(child);
  let href=child;
  if(!href.startsWith('/')){
   try{const url=new URL(href);if(!(publicNavigationHosts as readonly string[]).includes(url.hostname.toLowerCase().replace(/\.$/,'')))return [];href=url.pathname;}catch{return [];}
  }
  return [href.split(/[?#]/,1)[0]];
 });
}
export function localizedShellSettings(settings:GlobalSettings,locale:string,resolve:LocalizedRouteResolver):GlobalSettings{
 // Clone before rewriting so a cached source snapshot cannot acquire localized URLs.
 const result=structuredClone(settings);
 const map=(value:unknown):void=>{
  if(Array.isArray(value)){value.forEach(map);return;}
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
   if((key==='href'||key==='homeHref')&&typeof child==='string')(value as Record<string,unknown>)[key]=navigationLinkForLocale(child,locale,resolve);
   else map(child);
  }
 };
 map(result);
 if(result.announcement.enabled&&!result.announcement.title.trim())throw Error('Localized announcements require an explicit accessible title.');
 return result;
}
/** One settings/header snapshot supplies every shared surface; bind it to the page's SEO revision. */
export async function loadLocalizedShell(locale:string,expected:{recordId:string;revisionId:string},env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return null;
 z.string().uuid().parse(expected.recordId);z.string().uuid().parse(expected.revisionId);
 if(locale==='en'||!(/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)))throw Error('Invalid localized shell language.');
 const registryRead=localizedRoutesReader(env,fetcher),site=env.CMS_WEBSITE_ID!;
 const connection={url:env.CMS_SUPABASE_URL!,key:env.CMS_SUPABASE_ANON_KEY!};
 const raw=await cmsRpc(connection,connection.key,'get_public_header',{p_site:site,p_locale:locale},fetcher);
 const envelope=z.object({settings:z.unknown()}).parse(raw);
 const snapshot=await readPublishedSettings(site,locale,async()=>envelope.settings);
 if(!snapshot||snapshot.recordId!==expected.recordId||snapshot.revisionId!==expected.revisionId)throw Error('Localized settings publication changed. Reload before rendering.');
 const registry=await readLocalizedRoutes(site,locale,[...new Set(routeCandidates(raw))],registryRead);
 const header=projectPublishedHeader(raw,site,now,{locale,resolveLocalizedRoute:registry.resolve,requireAvailableReferences:true});
 const settings=localizedShellSettings(snapshot.payload,locale,registry.resolve);
 return {locale,recordId:snapshot.recordId,revisionId:snapshot.revisionId,header,settings,interfaceText:header.interfaceText};
}
