import {publicNavigationHosts} from './navigation-routes.ts';
/** Deployment route resolution must verify that the target language has a visitor route.
 * No default prefix or implicit source-language fallback is assumed here. */
export type LocalizedRouteResolver=(path:string,locale:string)=>string|null;
export function navigationLinkForLocale(href:string,locale:string,resolve?:LocalizedRouteResolver){
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))throw Error('Invalid navigation language.');
 if(locale==='en')return href;
 let path=href;
 if(!href.startsWith('/')){
  if(href.startsWith('#'))return href;
  const url=new URL(href),host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!(publicNavigationHosts as readonly string[]).includes(host)){
   if(host.endsWith('.safaricrafters.com'))throw Error('Localized navigation route is unavailable.');
   return href;
  }
  if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password)throw Error('Localized navigation route is unavailable.');
  path=url.pathname+url.search+url.hash;
 }
 if(!resolve)throw Error('Localized navigation requires verified route resolution.');
 const result=resolve(path,locale);
 if(!result||result===path||!result.startsWith('/')||result.startsWith('//')||/[\\\s\u0000-\u001f\u007f]/.test(result))throw Error('Localized navigation route is unavailable.');
 return result;
}
