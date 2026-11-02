import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedNews} from './published-news.ts';
import {usesCmsNews} from './news-route.ts';
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type NewsReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null)=>Promise<unknown>};
export function publicNewsConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):NewsReader|null{
 if(!usesCmsNews(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_news',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:after=>cmsRpc(connection,connection.key,'list_published_news',{p_site:site,p_after:after,p_limit:100},fetcher)};
}
export async function readPublishedNews(value:string,config:NewsReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('News delivery is not configured.');const path=`/news/${value}`,result=await config.read(config.site,path);return result===null?null:projectPublishedNews(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(110).regex(/^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image:image.nullable(),topic:z.string().trim().min(1).max(120),date:z.iso.date(),kind:z.enum(['news','pressRelease']),seo:pageSeoSchema}).strict();
export async function readPublishedNewsList(config:NewsReader|null){if(!config)throw Error('News delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after));for(const row of batch){if(after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid news pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>b.date.localeCompare(a.date)||a.recordId.localeCompare(b.recordId));}throw Error('News listing exceeds the delivery limit.');}
