import {createHash} from 'node:crypto';
import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {readPrivateHeroVideo} from './hero-video-preview.ts';
const descriptor=z.object({id:z.string(),site:z.string().uuid(),key:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),bytes:z.number().int().min(1).max(100_000_000)}).strict();
const assetSchema=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export type PublicVideoConfig={site:string;authorize:(site:string,asset:string)=>Promise<unknown>;read:(file:z.infer<typeof descriptor>)=>Promise<Response>};
export function publicVideoConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):PublicVideoConfig|null{
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||env.CMS_PUBLIC_HERO_VIDEO_ENABLED!=='true'||!env.CMS_WEBSITE_ID||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return {site:env.CMS_WEBSITE_ID,authorize:(site,asset)=>cmsRpc(connection,connection.key,'get_public_hero_video',{p_site:site,p_asset:asset},fetcher),read:file=>readPrivateHeroVideo(connection,connection.key,file,fetcher)};
}
export async function handlePublicVideo(request:Request,asset:string,config:PublicVideoConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'Published video is unavailable.'},{status,headers});
 if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503);
 if(request.method!=='GET'||new URL(request.url).search||!assetSchema.safeParse(asset).success)return fail(400);
 try{
  const parsed=descriptor.safeParse(await config.authorize(config.site,asset));if(!parsed.success)return fail(404);const file=parsed.data;
  if(file.site!==config.site||file.id!==asset||file.key!==`${config.site}/${asset}/delivery.mp4`)return fail(503);
  const range=request.headers.has('if-range')?null:request.headers.get('range');
  const slice=range?videoByteRange(range,file.bytes):null;
  if(range&&!slice)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${file.bytes}`,'Accept-Ranges':'bytes'}});
  const response=await config.read(file);
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!=='video/mp4')return fail(503);
  const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)!==file.bytes)return fail(503);
  const reader=response.body?.getReader();if(!reader)return fail(503);const bytes=new Uint8Array(file.bytes);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>file.bytes){void reader.cancel().catch(()=>{});return fail(503);}bytes.set(value,offset);offset+=value.length;}}finally{reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)return fail(503);
  const latest=descriptor.safeParse(await config.authorize(config.site,asset));
  if(!latest.success)return fail(404);
  if(Object.entries(file).some(([key,value])=>latest.data[key as keyof typeof file]!==value))return fail(503);
  const body=slice?bytes.subarray(slice.start,slice.end+1):bytes;
  return new Response(body,{status:slice?206:200,headers:{...headers,'Content-Type':'video/mp4','Content-Length':String(body.length),'Accept-Ranges':'bytes',...(slice?{'Content-Range':`bytes ${slice.start}-${slice.end}/${file.bytes}`}:{}),'Content-Disposition':'inline; filename="video.mp4"'}});
 }catch{return fail(503);}
}

/** One HTTP byte range; malformed, multiple and unsatisfiable ranges fail closed. */
export function videoByteRange(header:string,size:number):{start:number;end:number}|null{
 if(!Number.isSafeInteger(size)||size<1)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2]))return null;
 if(!match[1]){const suffix=Number(match[2]);return Number.isSafeInteger(suffix)&&suffix>0?{start:Math.max(0,size-suffix),end:size-1}:null;}
 const start=Number(match[1]),end=match[2]?Number(match[2]):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return null;
 return {start,end:Math.min(end,size-1)};
}
