import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition.ts';
const item=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string(),modifiedAt:z.string().datetime({offset:true}),
 slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().trim().min(1).max(200),description:z.string().trim().min(1).max(2000),
 continent:z.enum(['India','Africa','Americas','Arctic']),country:z.string().trim().min(1).max(200),region:z.string().max(200),bestMonths:z.string().trim().min(1).max(200),image,
 canonical:pageSeoSchema.shape.canonical,indexing:z.enum(['inherit','index','noindex']),sitemap:z.enum(['inherit','include','exclude']),
}).strict().refine(value=>value.path===`/destinations/${value.slug}`,'Destination path mismatch.');
export type PublishedDestinationSummary=z.infer<typeof item>;
export type DestinationListReader=(after:string|null)=>Promise<unknown>;
export async function readPublishedDestinationList(read:DestinationListReader){
 let after:string|null=null;const result:PublishedDestinationSummary[]=[];const paths=new Set<string>();
 for(let page=0;page<100;page++){
  const batch=z.array(item).max(100).parse(await read(after));
  for(const row of batch){
   if((after!==null&&row.recordId<=after)||paths.has(row.path))throw Error('Invalid destination pagination.');
   paths.add(row.path);after=row.recordId;result.push(row);
  }
  if(batch.length<100)return result.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));
 }
 throw Error('Destination catalogue exceeds the configured delivery limit.');
}
export function destinationListReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,locale='en'):DestinationListReader{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY||!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale))throw Error('Published destination listing is not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return after=>cmsRpc(config,config.key,'list_published_destinations',{p_site:env.CMS_WEBSITE_ID,p_locale:locale,p_after:after,p_limit:100},fetcher);
}
