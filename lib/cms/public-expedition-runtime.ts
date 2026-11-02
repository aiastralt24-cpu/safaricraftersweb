import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedExpedition} from './published-expedition.ts';
import type {PublicPageConfig} from './public-page.ts';
const envelope=z.object({page:z.unknown(),references:z.unknown()}).strict();
const uuid=z.string().uuid(),slugSchema=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** Requires deployment of the authorized SQL reader and explicit expedition rollout. */
export function publicExpeditionConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicPageConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_EXPEDITION_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const site=env.CMS_WEBSITE_ID!,config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site,read:async(requestSite,path,locale)=>{
  if(requestSite!==site||locale!=='en'||!path.startsWith('/photo-expeditions/')||!slugSchema.safeParse(path.slice('/photo-expeditions/'.length)).success)throw Error('Published expedition request identity mismatch.');
  return cmsRpc(config,config.key,'get_public_expedition',{p_site:site,p_path:path,p_locale:locale},fetcher);
 }};
}
export async function readPublishedExpedition(slug:string,config:PublicPageConfig|null,locale='en',today=new Date().toISOString().slice(0,10)){
 if(!slugSchema.safeParse(slug).success||locale!=='en')return null;
 if(!config||!uuid.safeParse(config.site).success)throw Error('Published expedition delivery is not configured.');
 z.iso.date().parse(today);
 const path=`/photo-expeditions/${slug}`,raw=await config.read(config.site,path,locale);if(raw===null)return null;
 const result=envelope.parse(raw);return projectPublishedExpedition(result.page,config.site,path,locale,result.references,today);
}
export async function handlePublishedExpedition(request:Request,slug:string,config:PublicPageConfig|null,today=new Date().toISOString().slice(0,10)){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published expedition is unavailable.'},{status,headers});
 if(request.method!=='GET')return fail(405);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>key!=='locale'||params.getAll(key).length!==1)||params.has('locale')&&params.get('locale')!=='en'||!slugSchema.safeParse(slug).success)return fail(400);
 if(!config)return fail(503);
 try{const expedition=await readPublishedExpedition(slug,config,'en',today);return expedition?Response.json({expedition},{headers}):fail(404);}catch{return fail(503);}
}
