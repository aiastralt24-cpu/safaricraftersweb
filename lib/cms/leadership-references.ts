import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {usesCmsLeadership} from './public-leadership-runtime.ts';
import {projectPublishedLeadership,type PublishedLeadership} from './published-leadership.ts';
const idsSchema=z.array(z.string().uuid()).max(30).refine(ids=>new Set(ids.map(id=>id.toLowerCase())).size===ids.length,'Select each leadership profile once.');
export type LeadershipReferenceReader={site:string;read:(site:string,record:string,locale:string)=>Promise<unknown>};
export function leadershipReferenceReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):LeadershipReferenceReader|null{
 if(!usesCmsLeadership(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};return {site:env.CMS_WEBSITE_ID!,read:(site,record,locale)=>cmsRpc(connection,connection.key,'get_public_leadership_reference',{p_site:site,p_record:record,p_locale:locale},fetcher)};
}
/** Follow current published profiles, retain editor order, and never substitute draft text. */
export async function readLeadershipReferences(records:string[],reader:LeadershipReferenceReader|null,locale='en'):Promise<PublishedLeadership[]>{
 const ids=idsSchema.parse(records).map(id=>id.toLowerCase());if(!ids.length)return [];
 if(locale!=='en')throw Error('Leadership section delivery is not connected for this language.');
 if(!reader)throw Error('Leadership section delivery is not configured.');
 const profiles:PublishedLeadership[]=[];
 for(let offset=0;offset<ids.length;offset+=5){
  const batch=await Promise.all(ids.slice(offset,offset+5).map(async id=>{
   const value=await reader.read(reader.site,id,locale);if(value===null)return null;
   const identity=z.object({recordId:z.string().uuid(),path:z.string()}).passthrough().parse(value);
   if(identity.recordId.toLowerCase()!==id)throw Error('Leadership reference identity mismatch.');
   return projectPublishedLeadership(value,identity.path,locale);
  }));
  for(const profile of batch)if(profile)profiles.push(profile);
 }
 return profiles;
}
