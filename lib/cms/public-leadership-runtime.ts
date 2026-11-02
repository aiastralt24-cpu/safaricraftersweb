import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedLeadership} from './published-leadership.ts';
export function usesCmsLeadership(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_LEADERSHIP_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type LeadershipReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null)=>Promise<unknown>};
export function publicLeadershipConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):LeadershipReader|null{
 if(!usesCmsLeadership(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_leadership',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:after=>cmsRpc(connection,connection.key,'list_published_leadership',{p_site:site,p_after:after,p_limit:100},fetcher)};
}
export async function readPublishedLeadership(value:string,config:LeadershipReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Leadership delivery is not configured.');const path=`/leadership/${value}`,result=await config.read(config.site,path);return result===null?null:projectPublishedLeadership(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(112).regex(/^\/leadership\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image:image.nullable(),role:z.string().trim().min(1).max(200),department:z.string().max(120),sortOrder:z.number().int().min(0).max(9999),status:z.enum(['current','former']),seo:pageSeoSchema}).strict();
export async function readPublishedLeadershipList(config:LeadershipReader|null){if(!config)throw Error('Leadership delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after));for(const row of batch){if(after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid leadership pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.sortOrder-b.sortOrder||a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Leadership listing exceeds the delivery limit.');}
