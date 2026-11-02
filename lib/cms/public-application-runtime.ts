import {z} from 'zod';
import {applicationPath,type ApplicationDraft} from './applications.ts';
type Kind=ApplicationDraft['kind'];
import {cmsRpc} from './gateway.ts';
import {projectPublishedApplication} from './published-application.ts';
export function usesCmsApplication(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_APPLICATION_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type ApplicationReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null,kind:Kind)=>Promise<unknown>};
export function publicApplicationConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ApplicationReader|null{
 if(!usesCmsApplication(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_application',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:(after,kind)=>cmsRpc(connection,connection.key,'list_published_applications',{p_site:site,p_after:after,p_limit:100,p_kind:kind},fetcher)};
}
export async function readPublishedApplication(value:string,config:ApplicationReader|null,kind:Kind='application'){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Application delivery is not configured.');const path=applicationPath(value,kind),result=await config.read(config.site,path);return result===null?null:projectPublishedApplication(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(114).regex(/^\/(?:applications|industries)\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image:image.nullable(),kind:z.enum(['application','industry']),seo:pageSeoSchema}).strict();
export async function readPublishedApplicationList(config:ApplicationReader|null,kind:Kind='application'){if(!config)throw Error('Application delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after,kind));for(const row of batch){if(row.kind!==kind||!row.path.startsWith(kind==='industry'?'/industries/':'/applications/')||after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid application pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Application listing exceeds the delivery limit.');}
