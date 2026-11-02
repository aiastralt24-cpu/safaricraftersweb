import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedDestination} from './published-destination.ts';
import type {PublicPageConfig} from './public-page.ts';
const envelope=z.object({page:z.unknown(),references:z.unknown()}).strict();
export function publicDestinationConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicPageConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!env.CMS_WEBSITE_ID||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site:env.CMS_WEBSITE_ID,read:async(site,path,locale)=>cmsRpc(config,config.key,'get_public_destination',{p_site:site,p_path:path,p_locale:locale},fetcher)};
}
export async function readPublishedDestination(slug:string,config:PublicPageConfig|null,locale='en'){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100||!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale))return null;
 if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Published destination delivery is not configured.');
 const result=await config.read(config.site,`/destinations/${slug}`,locale);if(result===null)return null;
 const value=envelope.parse(result);return projectPublishedDestination(value.page,`/destinations/${slug}`,locale,value.references);
}
export async function handlePublishedDestination(request:Request,slug:string,config:PublicPageConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published destination is unavailable.'},{status,headers});
 if(!config)return fail(503);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>key!=='locale'||params.getAll(key).length!==1))return fail(400);
 const locale=params.get('locale')??'en';if(!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale))return fail(400);
 try{const destination=await readPublishedDestination(slug,config,locale);return destination?Response.json({destination},{headers}):fail(404);}catch{return fail(503);}
}
