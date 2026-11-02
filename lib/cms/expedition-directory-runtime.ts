import {z} from 'zod';
import {publishedExpeditionCardSchema,readPublishedExpeditionDirectory,expeditionDirectoryReader} from './public-expedition-directory.ts';
import type {ExpeditionDirectoryRead} from './public-expedition-directory.ts';
const uuid=z.string().uuid();
const query=z.object({site:uuid,locale:z.literal('en').default('en')}).strict();
export type ExpeditionDirectoryConfig={site:string;read:ExpeditionDirectoryRead};
export function publicExpeditionDirectoryConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ExpeditionDirectoryConfig|null{
 try{return {site:uuid.parse(env.CMS_WEBSITE_ID),read:expeditionDirectoryReader(env,fetcher)};}catch{return null;}
}
/** Revalidate the whole directory at the browser boundary, including tenant and route identities. */
export function parseExpeditionDirectoryResponse(input:unknown,site:string,locale:string){
 const result=z.object({websiteId:uuid,locale:z.literal('en'),items:z.array(publishedExpeditionCardSchema).max(1000)}).strict().parse(input);
 if(result.websiteId!==site||result.locale!==locale)throw Error('Expedition directory identity mismatch.');
 const paths=new Set<string>();let previous:string|null=null;
 for(const card of result.items){
  if(card.websiteId!==site||card.path!==`/photo-expeditions/${card.content.slug}`||!card.content.image||paths.has(card.path)||previous!==null&&card.recordId<=previous)throw Error('Expedition directory identity or order mismatch.');
  previous=card.recordId;paths.add(card.path);
 }
 return result.items;
}
export async function handlePublicExpeditionDirectory(request:Request,config:ExpeditionDirectoryConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published expeditions are unavailable.'},{status,headers});
 if(request.method!=='GET')return fail(405);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail(400);
 const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)return fail(400);
 if(!config||!uuid.safeParse(config.site).success)return fail(503);
 if(parsed.data.site!==config.site)return fail(404);
 try{
  const items=await readPublishedExpeditionDirectory(config.site,config.read);
  const body={websiteId:config.site,locale:'en',items};
  parseExpeditionDirectoryResponse(body,config.site,'en');
  return Response.json(body,{headers});
 }catch{return fail(503);}
}
