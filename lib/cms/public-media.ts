import {createHash} from 'node:crypto';
import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {readPrivateMedia} from './media-preview.ts';
const descriptor=z.object({id:z.string(),site:z.string().uuid(),key:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),bytes:z.number().int().min(1).max(25_000_000)}).strict();
const assetSchema=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export type PublicMediaConfig={site:string;authorize:(site:string,asset:string)=>Promise<unknown>;read:(file:z.infer<typeof descriptor>)=>Promise<Response>};
export function publicMediaConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicMediaConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!env.CMS_WEBSITE_ID||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site:env.CMS_WEBSITE_ID,authorize:(site,asset)=>cmsRpc(connection,connection.key,'get_public_media',{p_site:site,p_asset:asset},fetcher),read:file=>readPrivateMedia(connection,connection.key,file,fetcher)};
}
export async function handlePublicMedia(request:Request,asset:string,config:PublicMediaConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published image is unavailable.'},{status,headers});
 if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503);
 if(request.method!=='GET'||new URL(request.url).search||!assetSchema.safeParse(asset).success)return fail(400);
 try{
  const parsed=descriptor.safeParse(await config.authorize(config.site,asset));if(!parsed.success)return fail(404);const file=parsed.data;
  if(file.site!==config.site||file.id!==asset||file.key!==`${config.site}/${asset}/delivery.webp`)return fail(503);
  const response=await config.read(file);
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!=='image/webp')return fail(503);
  const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)!==file.bytes)return fail(503);
  const reader=response.body?.getReader();if(!reader)return fail(503);const bytes=new Uint8Array(file.bytes);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>file.bytes){await reader.cancel();return fail(503);}bytes.set(value,offset);offset+=value.length;}}finally{reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)return fail(503);
  const latest=descriptor.safeParse(await config.authorize(config.site,asset));
  if(!latest.success)return fail(404);
  if(Object.entries(file).some(([key,value])=>latest.data[key as keyof typeof file]!==value))return fail(503);
  return new Response(bytes,{headers:{...headers,'Content-Type':'image/webp','Content-Length':String(bytes.length),'Content-Disposition':'inline; filename="image.webp"'}});
 }catch{return fail(503);}
}
