import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {certificationPath} from './certifications.ts';
import {projectPublishedCertification} from './published-certification.ts';
import {pageSeoSchema} from './page-seo.ts';
export function usesCmsCertification(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_CERTIFICATION_DELIVERY_ENABLED==='true';}
export type CertificationReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null)=>Promise<unknown>};
export function publicCertificationConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):CertificationReader|null{
 if(!usesCmsCertification(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_certification',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:after=>cmsRpc(connection,connection.key,'list_published_certifications',{p_site:site,p_after:after,p_limit:100},fetcher)};
}
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export async function readPublishedCertification(value:string,config:CertificationReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Certification delivery is not configured.');const path=certificationPath(value),result=await config.read(config.site,path);return result===null?null:projectPublishedCertification(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(116).regex(/^\/certifications\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),issuer:z.string().trim().min(1).max(200),seo:pageSeoSchema}).strict();
export async function readPublishedCertificationList(config:CertificationReader|null){if(!config)throw Error('Certification delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after));for(const row of batch){if(after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid certification pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Certification listing exceeds the delivery limit.');}
