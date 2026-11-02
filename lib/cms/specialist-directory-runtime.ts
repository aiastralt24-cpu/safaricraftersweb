import {z} from 'zod';
import {projectPublishedSpecialist,readPublishedSpecialists,specialistDirectoryReader} from './public-specialists.ts';
import type {SpecialistDirectoryCursor} from './public-specialists.ts';
const uuid=z.string().uuid();
const query=z.object({site:uuid,locale:z.literal('en').default('en')}).strict();
export type SpecialistDirectoryConfig={site:string;read:(site:string,locale:string,cursor:SpecialistDirectoryCursor|null)=>Promise<unknown>};
export function publicSpecialistDirectoryConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):SpecialistDirectoryConfig|null{
 try{return {site:uuid.parse(env.CMS_WEBSITE_ID),read:specialistDirectoryReader(env,fetcher)};}catch{return null;}
}
/** Validate the response again at the browser boundary; derived links are never trusted. */
export function parseSpecialistDirectoryResponse(input:unknown,site:string,locale:string){
 const result=z.object({websiteId:uuid,locale:z.literal('en'),items:z.array(z.unknown()).max(1000)}).strict().parse(input);
 if(result.websiteId!==site||result.locale!==locale)throw Error('Specialist directory identity mismatch.');
 const profiles=result.items.map(item=>{const identity=z.object({recordId:uuid}).parse(item);return projectPublishedSpecialist(item,site,identity.recordId,locale);});
 const seen=new Set<string>();
 profiles.forEach((profile,index)=>{
  const previous=profiles[index-1];
  if(seen.has(profile.recordId)||previous&&(profile.payload.sortOrder<previous.payload.sortOrder||profile.payload.sortOrder===previous.payload.sortOrder&&profile.recordId<=previous.recordId))throw Error('Specialist directory order is invalid.');
  seen.add(profile.recordId);
 });
 return profiles;
}
export async function handlePublicSpecialistDirectory(request:Request,config:SpecialistDirectoryConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published specialists are unavailable.'},{status,headers});
 if(request.method!=='GET')return fail(405);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail(400);
 const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)return fail(400);
 if(!config||!uuid.safeParse(config.site).success)return fail(503);
 if(parsed.data.site!==config.site)return fail(404);
 try{
  const profiles=await readPublishedSpecialists(config.site,parsed.data.locale,config.read);
  const items=profiles.map(({relatedJourneys:_journeys,planningHref:_planning,...profile})=>profile);
  return Response.json({websiteId:config.site,locale:parsed.data.locale,items},{headers});
 }catch{return fail(503);}
}
