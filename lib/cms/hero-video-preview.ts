import {createHash} from 'node:crypto';
import {z} from 'zod';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const query=z.object({site:z.string().uuid(),asset:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict();
const descriptor=query.extend({id:z.string(),key:z.string(),bytes:z.number().int().min(1).max(100_000_000),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).omit({asset:true}).strict();
type Descriptor=z.infer<typeof descriptor>;
type Adapter={authorize:(token:string,site:string,asset:string)=>Promise<unknown>;read:(token:string,file:Descriptor)=>Promise<Response>};
export async function readPrivateHeroVideo(config:{url:string;key:string},token:string,file:Descriptor,fetcher:typeof fetch=fetch){
 let base:URL;try{base=new URL(config.url);}catch{throw new CmsGatewayError(503,'CMS storage is not configured.');}
 if(base.protocol!=='https:'||base.pathname!=='/'||base.username||base.password||base.search||base.hash||!config.key)throw new CmsGatewayError(503,'CMS storage is not configured.');
 // Only encoded path segments are accepted; storage names never become a URL origin/query.
 const path=file.key.split('/').map(part=>encodeURIComponent(part)).join('/');
 try{return await fetcher(new URL(`/storage/v1/object/authenticated/cms-video-media/${path}`,base),{headers:{apikey:config.key,Authorization:`Bearer ${token}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(120000)});}catch{throw new CmsGatewayError(503,'Video preview is temporarily unavailable.');}
}
const adapter:Adapter={authorize:(token,site,asset)=>cmsRpc(cmsConnection(),token,'get_hero_video_preview',{p_site:site,p_asset:asset}),read:(token,file)=>readPrivateHeroVideo(cmsConnection(),token,file)};
export async function handleHeroVideoPreview(request:Request,backend:Adapter=adapter){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const q=query.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!q.success)throw new CmsGatewayError(400,'Select a valid video.');
  const parsed=descriptor.safeParse(await backend.authorize(token,q.data.site,q.data.asset));if(!parsed.success)throw new CmsGatewayError(404,'Video preview is unavailable.');
  const file=parsed.data;
  if(file.site!==q.data.site||file.id!==q.data.asset||file.key!==`${file.site}/${file.id}/delivery.mp4`)throw new CmsGatewayError(503,'Video preview is unavailable.');
  const response=await backend.read(token,file);
  if(!response.ok)throw new CmsGatewayError(response.status===403?403:503,'Video preview is unavailable.');
  if(response.headers.get('content-type')?.split(';')[0].trim()!=='video/mp4')throw new CmsGatewayError(503,'Video preview failed verification.');
  const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)!==file.bytes)throw new CmsGatewayError(503,'Video preview failed verification.');
  const reader=response.body?.getReader();if(!reader)throw new CmsGatewayError(503,'Video preview is empty.');
  const bytes=new Uint8Array(file.bytes);let offset=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>bytes.length){void reader.cancel().catch(()=>{});throw new CmsGatewayError(503,'Video preview failed verification.');}bytes.set(value,offset);offset+=value.length;}}finally{reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new CmsGatewayError(503,'Video preview failed verification.');
  return new Response(bytes,{headers:{...privateHeaders,'Content-Type':'video/mp4','Content-Length':String(bytes.length),'X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="video.mp4"'}});
 }catch(error){return cmsErrorResponse(error);}
}
