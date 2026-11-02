import {z} from 'zod';
import {isCustomPagePath} from './custom-page-path.ts';
import {localizedRequest} from './localized-request.ts';
import {cmsRpc} from './gateway.ts';
const redirectSchema=z.object({from:z.string().refine(isCustomPagePath),to:z.string().refine(isCustomPagePath),status:z.literal(308)}).strict();
export function parsePageRedirect(value:unknown,path:string){if(value===null)return null;const result=redirectSchema.parse(value);if(result.from!==path||result.from===result.to)throw Error('Invalid page redirect identity.');return result;}
export async function readPageRedirect(path:string,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,locale='en'){
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))throw Error('Invalid redirect language.');
 if(locale!=='en'&&env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return null;
 if(env.CMS_PAGE_REDIRECTS_ENABLED!=='true'||!isCustomPagePath(path))return null;
 if(env.CMS_CUSTOM_PAGES_ENABLED!=='true'||env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Page redirects are not configured.');
 const bounded:typeof fetch=(url,init)=>fetcher(url,{...init,signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(1500)])});
 return parsePageRedirect(await cmsRpc({url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},env.CMS_SUPABASE_ANON_KEY,'get_public_page_redirect',{p_site:env.CMS_WEBSITE_ID,p_path:path,p_locale:locale},bounded),path);
}
export function pageRedirectResponse(requestUrl:string,value:unknown,locale='en'){
 const url=new URL(requestUrl),localized=locale==='en'?null:localizedRequest(url.pathname);
 if(locale!=='en'&&(!localized||localized.locale!==locale))throw Error('Redirect language does not match the requested address.');
 const redirect=parsePageRedirect(value,localized?.path??url.pathname);if(!redirect)return null;
 url.pathname=localized?`/languages/${localized.locale}${redirect.to}`:redirect.to;url.hash='';
 return new Response(null,{status:308,headers:{Location:url.href,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
