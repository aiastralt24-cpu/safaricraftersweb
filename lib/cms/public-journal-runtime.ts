import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedJournal} from './published-journal.ts';
import type {PublicPageConfig} from './public-page.ts';
const slugSchema=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export function publicJournalConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicPageConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_JOURNAL_DELIVERY_ENABLED!=='true'||!env.CMS_WEBSITE_ID||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site:env.CMS_WEBSITE_ID,read:async(site,path,locale)=>cmsRpc(config,config.key,'get_public_journal_article',{p_site:site,p_path:path,p_locale:locale},fetcher)};
}
export async function readPublishedJournal(slug:string,config:PublicPageConfig|null,locale='en'){
 if(!slugSchema.safeParse(slug).success||locale!=='en')return null;
 if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Published article delivery is not configured.');
 const path=`/journal/${slug}`,result=await config.read(config.site,path,locale);
 return result===null?null:projectPublishedJournal(result,path,locale);
}
export async function handlePublishedJournal(request:Request,slug:string,config:PublicPageConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published article is unavailable.'},{status,headers});
 if(request.method!=='GET')return fail(405);
 if(!config)return fail(503);
 const params=new URL(request.url).searchParams;
 if(!slugSchema.safeParse(slug).success||[...params.keys()].some(key=>key!=='locale'||params.getAll(key).length!==1)||(params.get('locale')??'en')!=='en')return fail(400);
 try{const article=await readPublishedJournal(slug,config);return article?Response.json({article},{headers}):fail(404);}catch{return fail(503);}
}
