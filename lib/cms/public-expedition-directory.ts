import {z} from 'zod';
import {photoExpeditionSchema} from './photo-expeditions.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid(),snapshotSchema=z.string().regex(/^[a-f0-9]{32}$/);
export const publishedExpeditionCardSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:z.literal('en'),path:z.string(),content:photoExpeditionSchema.pick({slug:true,title:true,geography:true,programmeStatus:true,category:true,duration:true,description:true,price:true,dateLabel:true,image:true,departures:true,seo:true})}).strict();
const page=z.object({websiteId:uuid,locale:z.literal('en'),snapshot:snapshotSchema,items:z.array(publishedExpeditionCardSchema).max(50),nextCursor:uuid.nullable()}).strict();
export type PublishedExpeditionCard=z.infer<typeof publishedExpeditionCardSchema>;
export type ExpeditionDirectoryRead=(site:string,after:string|null,snapshot:string|null)=>Promise<unknown>;
/** Returns no partial directory if publication/eligibility changes during traversal. */
export async function readPublishedExpeditionDirectory(site:string,read:ExpeditionDirectoryRead){
 uuid.parse(site);const result:PublishedExpeditionCard[]=[];let after:string|null=null,snapshot:string|null=null;
 for(let count=0;count<21;count++){
  const value=page.parse(await read(site,after,snapshot));if(value.websiteId!==site||snapshot!==null&&value.snapshot!==snapshot)throw Error('Expedition directory changed. Reload it.');snapshot=value.snapshot;
  let previous:string|null=after;
  for(const item of value.items){if(item.websiteId!==site||item.path!==`/photo-expeditions/${item.content.slug}`||!item.content.image||previous!==null&&item.recordId<=previous)throw Error('Published expedition directory identity mismatch.');previous=item.recordId;result.push(item);}
  if(result.length>1000)throw Error('Expedition directory exceeds its supported limit.');
  if(value.nextCursor===null)return result;
  if(!value.items.length||value.nextCursor!==previous||value.nextCursor===after)throw Error('Invalid expedition directory cursor.');after=value.nextCursor;
 }
 throw Error('Expedition directory traversal did not finish.');
}
export function expeditionDirectoryReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ExpeditionDirectoryRead{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_EXPEDITION_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published expeditions are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};return(site,after,snapshot)=>{if(site!==env.CMS_WEBSITE_ID)throw Error('Expedition website mismatch.');if(after)uuid.parse(after);if(snapshot)snapshotSchema.parse(snapshot);return cmsRpc(config,config.key,'list_public_expeditions',{p_site:site,p_locale:'en',p_after:after,p_snapshot:snapshot,p_limit:50},fetcher);};
}
