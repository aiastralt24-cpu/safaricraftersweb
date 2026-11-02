import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import type {LocalizedRouteResolver} from './localized-navigation-link.ts';
const language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).refine(value=>value!=='en');
const path=z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(value=>!value.includes('//'));
const identity=z.string().uuid();
const requestPaths=z.array(path).max(1000).refine(items=>new Set(items).size===items.length);
const entry=z.discriminatedUnion('available',[z.object({path,available:z.literal(false)}).strict(),z.object({path:path.refine(isCustomPagePath),available:z.literal(true),recordId:identity,revisionId:identity}).strict()]);
const envelope=z.object({websiteId:identity,locale:language,routes:z.array(entry).max(1000)}).strict();
export function localizedPageHref(locale:string,contentPath:string){return `/languages/${language.parse(locale)}${path.refine(isCustomPagePath).parse(contentPath)}`;}
/** A complete response for the requested paths, never a partial or guessed registry. */
export function verifiedLocalizedRoutes(input:unknown,site:string,locale:string,paths:string[]){
 identity.parse(site);language.parse(locale);requestPaths.parse(paths);
 const value=envelope.parse(input);
 if(value.websiteId!==site||value.locale!==locale||value.routes.length!==paths.length||value.routes.some((row,index)=>row.path!==paths[index]))throw Error('Localized route registry identity mismatch.');
 const ids=value.routes.flatMap(row=>row.available?[row.recordId]:[]);
 if(new Set(ids).size!==ids.length)throw Error('Localized route registry contains duplicate records.');
 const routes=new Map(value.routes.map(row=>[row.path,row]));
 const resolve:LocalizedRouteResolver=(href,requestedLocale)=>{
  if(requestedLocale!==locale)return null;
  // The published path is verified independently; preserve queries and fragments verbatim.
  const match=/^(\/[^?#]*)([?#].*)?$/.exec(href);if(!match)return null;
  const row=routes.get(match[1]);return row?.available?localizedPageHref(locale,row.path)+(match[2]??''):null;
 };
 return {websiteId:value.websiteId,locale:value.locale,routes:value.routes,resolve};
}
export async function readLocalizedRoutes(site:string,locale:string,paths:string[],read:(site:string,locale:string,paths:string[])=>Promise<unknown>){
 identity.parse(site);language.parse(locale);requestPaths.parse(paths);
 return verifiedLocalizedRoutes(await read(site,locale,paths),site,locale,paths);
}
export function localizedRoutesReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true'||env.CMS_CUSTOM_PAGES_ENABLED!=='true'||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!identity.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Localized page delivery is not configured.');
 return (site:string,locale:string,paths:string[])=>{
  if(site!==env.CMS_WEBSITE_ID)throw Error('Localized route website mismatch.');language.parse(locale);requestPaths.parse(paths);
  return cmsRpc({url:env.CMS_SUPABASE_URL!,key:env.CMS_SUPABASE_ANON_KEY!},env.CMS_SUPABASE_ANON_KEY!,'get_public_localized_routes',{p_site:site,p_locale:locale,p_paths:paths},fetcher);
 };
}
