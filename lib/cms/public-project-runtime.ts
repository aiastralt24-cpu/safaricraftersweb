import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {projectPublishedProject} from './published-project.ts';
import {usesCmsProjects} from './project-route.ts';
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type ProjectReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null)=>Promise<unknown>};
export function publicProjectConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ProjectReader|null{
 if(!usesCmsProjects(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_project',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:after=>cmsRpc(connection,connection.key,'list_published_projects',{p_site:site,p_after:after,p_limit:100},fetcher)};
}
export async function readPublishedProject(value:string,config:ProjectReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Project delivery is not configured.');const path=`/projects/${value}`,result=await config.read(config.site,path);return result===null?null:projectPublishedProject(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(110).regex(/^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image,industry:z.string().max(120),kind:z.enum(['project','caseStudy']),seo:pageSeoSchema}).strict();
export async function readPublishedProjects(config:ProjectReader|null){if(!config)throw Error('Project delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after));for(const row of batch){if(after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid project pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Project listing exceeds the delivery limit.');}
