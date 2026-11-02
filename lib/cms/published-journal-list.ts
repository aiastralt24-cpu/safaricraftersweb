import {isCanonicalSitemapEntry} from './sitemap-policy.ts';
import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition.ts';
const item=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string(),modifiedAt:z.string().datetime({offset:true}),
 slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().trim().min(1).max(200),description:z.string().trim().min(1).max(2000),
 category:z.string().trim().min(1).max(200),author:z.string().trim().min(1).max(200),date:z.iso.date(),readTime:z.string().max(80),image,
 canonical:pageSeoSchema.shape.canonical,indexing:z.enum(['inherit','index','noindex']),sitemap:z.enum(['inherit','include','exclude']),
}).strict().refine(value=>value.path===`/journal/${value.slug}`,'Article path mismatch.');
export type PublishedJournalSummary=z.infer<typeof item>;
export type JournalListReader=(after:string|null)=>Promise<unknown>;
export async function readPublishedJournalList(read:JournalListReader){
 let after:string|null=null;const result:PublishedJournalSummary[]=[],paths=new Set<string>();
 for(let page=0;page<100;page++){
  const batch=z.array(item).max(100).parse(await read(after));
  for(const row of batch){if((after!==null&&row.recordId<=after)||paths.has(row.path))throw Error('Invalid journal pagination.');paths.add(row.path);after=row.recordId;result.push(row);}
  if(batch.length<100)return result.sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));
 }
 throw Error('Journal catalogue exceeds the configured delivery limit.');
}
export function journalListReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):JournalListReader{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_JOURNAL_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published journal listing is not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return after=>cmsRpc(config,config.key,'list_published_journal',{p_site:env.CMS_WEBSITE_ID,p_locale:'en',p_after:after,p_limit:100},fetcher);
}
export function journalSearchItems(items:PublishedJournalSummary[]){return items.filter(item=>item.indexing!=='noindex').map(item=>({title:item.title,href:item.path,type:'Journal' as const,detail:item.category}));}
export function journalSitemapItems(items:PublishedJournalSummary[],base:string){return items.filter(item=>isCanonicalSitemapEntry(item,base)).map(item=>({url:new URL(item.path,base).href,lastModified:new Date(item.modifiedAt)}));}
