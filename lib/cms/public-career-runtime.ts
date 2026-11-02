import {z} from 'zod';
import {careerPath,type CareerDraft} from './careers.ts';
type Kind=CareerDraft['employment'];
import {cmsRpc} from './gateway.ts';
import {projectPublishedCareer} from './published-career.ts';
export function usesCmsCareer(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_CAREER_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type CareerReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null,kind:Kind|null)=>Promise<unknown>};
export function publicCareerConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):CareerReader|null{
 if(!usesCmsCareer(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_career',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:(after,kind)=>cmsRpc(connection,connection.key,'list_published_careers',{p_site:site,p_after:after,p_limit:100,p_employment:kind},fetcher)};
}
export async function readPublishedCareer(value:string,config:CareerReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Career delivery is not configured.');const path=careerPath(value),result=await config.read(config.site,path);return result===null?null:projectPublishedCareer(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(109).regex(/^\/careers\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image:image.nullable(),employment:z.enum(['fullTime','partTime','contract','temporary','internship','volunteer','other']),status:z.enum(['open','paused','closed']),opensAt:z.union([z.literal(''),z.iso.datetime({offset:true})]),closesAt:z.union([z.literal(''),z.iso.datetime({offset:true})]),seo:pageSeoSchema}).strict();
export async function readPublishedCareerList(config:CareerReader|null,kind:Kind|null=null){if(!config)throw Error('Career delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after,kind));for(const row of batch){if(kind!==null&&row.employment!==kind||!row.path.startsWith('/careers/')||after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid career pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Career listing exceeds the delivery limit.');}
