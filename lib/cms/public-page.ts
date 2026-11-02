import {z} from 'zod';
import {validateStoredContent} from './content-validation.ts';
import {validateComposition} from './composition.ts';
import {pageSeoSchema} from './page-seo.ts';
const query=z.object({path:z.string().min(1).max(500).regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//')),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en')}).strict();
const stored=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.enum(['journey','page','homepage']),payload:z.record(z.string(),z.unknown())}).strict();
export function projectPublishedPage(input:unknown,path:string){
 const parsed=stored.safeParse(input);if(!parsed.success)return null;
 const value=parsed.data;
 if(value.type==='journey'){
  // The public SQL reader independently checks current media availability.
  // These IDs are only supplied here to reuse its structural content checks.
  const media=Array.isArray(value.payload.media)?value.payload.media:[];
  const statuses=media.flatMap(item=>item&&typeof item==='object'&&typeof item.assetId==='string'?[{assetId:item.assetId,available:true}]:[]);
  if(!validateStoredContent({type:value.type,path,payload:value.payload},statuses).contentChecksPass)return null;
 }else{
  if(Object.keys(value.payload).some(key=>!['composition','seo'].includes(key)))return null;
  if(!validateComposition(value.payload.composition).valid)return null;
  if(value.payload.seo!==undefined&&!pageSeoSchema.safeParse(value.payload.seo).success)return null;
 }
 return value;
}
export type PublicPageConfig={site:string;read:(site:string,path:string,locale:string)=>Promise<unknown>};
export async function handlePublicPageRead(request:Request,config:PublicPageConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published content is unavailable.'},{status,headers});
 if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503);
 if(request.method!=='GET')return fail(405);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].length!==new Set(params.keys()).size)return fail(400);
 const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)return fail(400);
 try{const input=await config.read(config.site,parsed.data.path,parsed.data.locale);if(input===null)return fail(404);const page=projectPublishedPage(input,parsed.data.path);return page?Response.json({page},{headers}):fail(503);}catch{return fail(503);}
}
