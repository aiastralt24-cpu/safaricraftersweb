import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
const item=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string(),modifiedAt:z.string().datetime({offset:true}),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(1).max(200),description:z.string().min(1).max(50000),region:z.string().min(1).max(50000),duration:z.string().min(1).max(50000),bestMonths:z.string().min(1).max(50000),hero:z.object({assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),alt:z.string().min(1).max(50000)}).strict().nullable()}).strict().refine(value=>value.path===`/journeys/${value.slug}`,'Journey path mismatch.');
export const publishedJourneySummarySchema=item;
export type PublishedJourneySummary=z.infer<typeof item>;
export type JourneyListReader=(after:string|null)=>Promise<unknown>;
export async function readPublishedJourneyList(read:JourneyListReader){
 let after:string|null=null;const result:PublishedJourneySummary[]=[];const seen=new Set<string>();
 for(let page=0;page<100;page++){
  const batch=z.array(item).max(100).parse(await read(after));
  for(const row of batch){if(seen.has(row.recordId)||(after!==null&&row.recordId<=after))throw Error('Invalid journey pagination.');seen.add(row.recordId);after=row.recordId;result.push(row);}
  if(batch.length<100)return result.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));
 }
 throw Error('Journey catalogue exceeds the configured delivery limit.');
}
export function journeyListReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):JourneyListReader{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published journey listing is not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return after=>cmsRpc(config,config.key,'list_published_journeys',{p_site:env.CMS_WEBSITE_ID,p_locale:'en',p_after:after,p_limit:100},fetcher);
}
