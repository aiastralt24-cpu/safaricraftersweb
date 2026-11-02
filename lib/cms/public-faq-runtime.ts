import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {verifiedPublicFaq,type PublicFaq} from './public-faq.ts';
const idsSchema=z.array(z.string().uuid()).max(50).refine(ids=>new Set(ids.map(id=>id.toLowerCase())).size===ids.length,'Select each FAQ once.');
export type FaqReader={site:string;read:(site:string,record:string,locale:string)=>Promise<unknown>};
export function publicFaqReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):FaqReader|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};return {site:env.CMS_WEBSITE_ID!,read:(site,record,locale)=>cmsRpc(connection,connection.key,'get_public_faq',{p_site:site,p_record:record,p_locale:locale},fetcher)};
}
/** Preserve editor order; omit withdrawn answers without falling back to draft text. */
export async function readPublishedFaqs(records:string[],reader:FaqReader|null,locale='en'):Promise<PublicFaq[]>{
 const ids=idsSchema.parse(records).map(id=>id.toLowerCase());if(!ids.length)return [];
 if(locale!=='en')throw Error('Reusable FAQ delivery is not connected for this language.');if(!reader)throw Error('FAQ delivery is not configured.');
 const answers:PublicFaq[]=[];
 // Bound concurrency so one page cannot flood the provider.
 for(let offset=0;offset<ids.length;offset+=5){const batch=await Promise.all(ids.slice(offset,offset+5).map(async id=>verifiedPublicFaq(await reader.read(reader.site,id,locale),id,locale)));for(const faq of batch)if(faq)answers.push(faq);}
 return answers;
}
