import {isCustomPagePath} from './custom-page-path.ts';
export const cmsPathHeader='x-cms-visitor-path';
export function localizedRequest(path:string){
 const match=/^\/languages\/([a-z]{2,3}(?:-[A-Z]{2})?)(\/.*)$/.exec(path);
 if(!match||match[1]==='en'||!isCustomPagePath(match[2]))return null;
 return {locale:match[1],path:match[2]};
}
/** Never retain a client-supplied internal pathname header. */
export function visitorRequestHeaders(input:Headers,path:string){const result=new Headers(input);result.set(cmsPathHeader,path);return result;}
export function requiresDocumentNavigation(current:string,target:string){return current.startsWith('/languages/')||target.startsWith('/languages/');}
