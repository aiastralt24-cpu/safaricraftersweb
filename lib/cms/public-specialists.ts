import {z} from 'zod';
import {specialistSchema} from './specialists.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid();
const reference=z.object({recordId:uuid,available:z.literal(true),type:z.literal('journey'),title:z.string().trim().min(1).max(200),path:z.string().regex(/^\/journeys\/[a-z0-9]+(?:-[a-z0-9]+)*$/),locale:z.literal('en')}).strict();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:z.literal('en'),payload:specialistSchema.omit({video:true}),references:z.array(reference).max(100)}).strict();
export function projectPublishedSpecialist(input:unknown,site:string,record:string,locale='en'){
 const value=envelope.parse(input),profile=value.payload;
 if(value.websiteId!==site||value.recordId!==record||locale!=='en')throw Error('Published specialist identity mismatch.');
 if(!profile.visible||!profile.image||profile.expeditions.length||!profile.role.trim()||!profile.expertise.trim()||!profile.bio.trim()||!profile.planning.label.trim()||!profile.planning.enquiryName.trim())throw Error('Published specialist is incomplete or unsupported.');
 const ids=new Set(value.references.map(item=>item.recordId));
 if(ids.size!==value.references.length||ids.size!==profile.journeys.length||profile.journeys.some(item=>!ids.has(item.recordId)))throw Error('Published specialist references do not match.');
 return {...value,relatedJourneys:profile.journeys.map(item=>value.references.find(ref=>ref.recordId===item.recordId)!),planningHref:`/plan?specialist=${encodeURIComponent(profile.planning.enquiryName)}`};
}
export async function readPublishedSpecialist(site:string,record:string,locale:string,read:(site:string,record:string,locale:string)=>Promise<unknown>){uuid.parse(site);uuid.parse(record);if(locale!=='en')throw Error('Published specialist language is unsupported.');const value=await read(site,record,locale);return value===null?null:projectPublishedSpecialist(value,site,record,locale);}
export type PublishedSpecialist=ReturnType<typeof projectPublishedSpecialist>;
export function specialistReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published specialists are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};return (site:string,record:string,locale:string)=>{if(site!==env.CMS_WEBSITE_ID||locale!=='en')throw Error('Published specialist identity mismatch.');uuid.parse(record);return cmsRpc(config,config.key,'get_public_specialist',{p_site:site,p_record:record,p_locale:locale},fetcher);};
}

const directoryCursor=z.object({sortOrder:z.number().int().min(0).max(9999),recordId:uuid}).strict();
export type SpecialistDirectoryCursor=z.infer<typeof directoryCursor>;
const directoryPage=z.object({websiteId:uuid,locale:z.literal('en'),items:z.array(envelope).max(100),nextCursor:directoryCursor.nullable()}).strict();
/** Bounded cursor traversal. A malformed page never becomes a partial successful directory. */
export async function readPublishedSpecialists(site:string,locale:string,read:(site:string,locale:string,cursor:SpecialistDirectoryCursor|null)=>Promise<unknown>){
 uuid.parse(site);if(locale!=='en')throw Error('Published specialist language is unsupported.');
 const result:ReturnType<typeof projectPublishedSpecialist>[]=[];const seen=new Set<string>();let cursor:SpecialistDirectoryCursor|null=null;
 for(let page=0;page<20;page++){
  const response=directoryPage.parse(await read(site,locale,cursor));if(response.websiteId!==site||response.locale!==locale)throw Error('Specialist directory identity mismatch.');
  let previous=cursor;
  for(const item of response.items){
   const current={sortOrder:item.payload.sortOrder,recordId:item.recordId};
   if(seen.has(item.recordId)||previous&&(current.sortOrder<previous.sortOrder||current.sortOrder===previous.sortOrder&&current.recordId<=previous.recordId))throw Error('Specialist directory order changed. Reload the directory.');
   seen.add(item.recordId);result.push(projectPublishedSpecialist(item,site,item.recordId,locale));previous=current;
  }
  if(result.length>1000)throw Error('Specialist directory exceeds the supported size.');
  if(response.nextCursor===null)return result;
  if(!response.items.length||!previous||response.nextCursor.sortOrder!==previous.sortOrder||response.nextCursor.recordId!==previous.recordId)throw Error('Specialist directory cursor mismatch.');
  cursor=response.nextCursor;
 }
 throw Error('Specialist directory did not finish within its page limit.');
}
export function specialistDirectoryReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published specialists are not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};return (site:string,locale:string,cursor:SpecialistDirectoryCursor|null)=>{
  if(site!==env.CMS_WEBSITE_ID||locale!=='en')throw Error('Specialist directory identity mismatch.');if(cursor)directoryCursor.parse(cursor);
  return cmsRpc(config,config.key,'list_public_specialists',{p_site:site,p_locale:locale,p_after_order:cursor?.sortOrder??null,p_after_id:cursor?.recordId??null,p_limit:50},fetcher);
 };
}
