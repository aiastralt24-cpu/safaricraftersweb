import {z} from 'zod';
import {partnerPath,type PartnerDraft} from './partners.ts';
type Kind=PartnerDraft['kind'];
import {cmsRpc} from './gateway.ts';
import {projectPublishedPartner} from './published-partner.ts';
export function usesCmsPartner(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_PARTNER_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type PartnerReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null,kind:Kind|null)=>Promise<unknown>};
export function publicPartnerConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PartnerReader|null{
 if(!usesCmsPartner(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_partner',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:(after,kind)=>cmsRpc(connection,connection.key,'list_published_partners',{p_site:site,p_after:after,p_limit:100,p_kind:kind},fetcher)};
}
export async function readPublishedPartner(value:string,config:PartnerReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Partner delivery is not configured.');const path=partnerPath(value),result=await config.read(config.site,path);return result===null?null:projectPublishedPartner(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(110).regex(/^\/partners\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),image:image.nullable(),kind:z.enum(['dealer','servicePartner','both']),seo:pageSeoSchema}).strict();
export async function readPublishedPartnerList(config:PartnerReader|null,kind:Kind|null=null){if(!config)throw Error('Partner delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after,kind));for(const row of batch){if(kind!==null&&row.kind!==kind||!row.path.startsWith('/partners/')||after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid partner pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Partner listing exceeds the delivery limit.');}
