import {createHash} from 'node:crypto';
import {z} from 'zod';
import {documentSchema} from './documents.ts';
import {bearerToken,cmsRpc,CmsGatewayError,privateHeaders,cmsErrorResponse} from './gateway.ts';
const uuid=z.string().uuid();
const downloadQuery=z.object({record:uuid,revision:uuid.optional()}).strict();
const descriptor=z.object({site:uuid,record:uuid,revision:uuid,id:uuid,key:z.string(),bytes:z.number().int().min(1).max(25_000_000),sha256:z.string().regex(/^[a-f0-9]{64}$/),downloadName:documentSchema.shape.file.unwrap().shape.downloadName,label:z.string().min(1).max(100),access:z.enum(['public','authenticated']),expired:z.boolean()}).strict();
type File=z.infer<typeof descriptor>;
export type DocumentDownloadAdapter={site:string;authorize:(token:string|null,record:string)=>Promise<unknown>;read:(file:File)=>Promise<Response>};
/** Server-only transfer adapter. Authorization always uses the visitor identity;
 * the service credential is confined to the already-authorized private file read. */
export function createDocumentDownloadAdapter(config:{url:string;anonKey:string;serviceKey:string;site:string},fetcher:typeof fetch=fetch):DocumentDownloadAdapter{
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.anonKey||!config.serviceKey||!uuid.safeParse(config.site).success)throw Error('Invalid document delivery configuration.');
 return {site:config.site,
  authorize:(token,record)=>cmsRpc({url:config.url,key:config.anonKey},token??config.anonKey,'get_document_download',{p_site:config.site,p_record:record},fetcher),
  async read(input){const file=descriptor.parse(input);if(file.site!==config.site||file.key!==`${config.site}/${file.id}/delivery.pdf`)throw Error('Invalid document file identity.');
   return fetcher(new URL(`/storage/v1/object/authenticated/cms-document-media/${file.key}`,base),{headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30_000)});
  },
 };
}
function configuredAdapter():DocumentDownloadAdapter|null{
 if(process.env.CMS_DOCUMENT_DOWNLOADS_ENABLED!=='true')return null;
 try{return createDocumentDownloadAdapter({url:process.env.CMS_SUPABASE_URL||'',anonKey:process.env.CMS_SUPABASE_ANON_KEY||'',serviceKey:process.env.CMS_SUPABASE_SERVICE_ROLE_KEY||'',site:process.env.CMS_WEBSITE_ID||''});}catch{return null;}
}
export async function handleDocumentDownload(request:Request,backend:DocumentDownloadAdapter|null=configuredAdapter()){
 try{
  if(!backend)throw new CmsGatewayError(404,'Document download is unavailable.');
  const params=new URL(request.url).searchParams,query=downloadQuery.safeParse(Object.fromEntries(params));
  if(!query.success||Array.from(params).length!==Object.keys(query.data).length)throw new CmsGatewayError(400,'Choose a document to download.');
  const {record,revision}=query.data;
  const header=request.headers.get('authorization'),token=header===null?null:bearerToken(header);
  const parsed=descriptor.safeParse(await backend.authorize(token,record!));if(!parsed.success)throw new CmsGatewayError(404,'Document download is unavailable.');const file=parsed.data;
  if(file.site!==backend.site||file.record!==record||file.key!==`${file.site}/${file.id}/delivery.pdf`||file.access==='authenticated'&&!token)throw new CmsGatewayError(404,'Document download is unavailable.');
  if(revision&&file.revision!==revision)throw new CmsGatewayError(409,'This document version has been replaced. Ask for an updated link.');
  const response=await backend.read(file),length=response.headers.get('content-length');
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!=='application/pdf'||length!==null&&(!/^\d+$/.test(length)||Number(length)!==file.bytes))throw new CmsGatewayError(503,'Document download failed verification.');
  const reader=response.body?.getReader();if(!reader)throw new CmsGatewayError(503,'Document download is empty.');const bytes=new Uint8Array(file.bytes);let offset=0;
  try{while(true){const part=await reader.read();if(part.done)break;if(offset+part.value.length>bytes.length)throw new CmsGatewayError(503,'Document download failed verification.');bytes.set(part.value,offset);offset+=part.value.length;}}
  catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new CmsGatewayError(503,'Document download failed verification.');
  const latest=descriptor.safeParse(await backend.authorize(token,record!));
  if(!latest.success||JSON.stringify(latest.data)!==JSON.stringify(file))throw new CmsGatewayError(403,'Document access changed. Reload before downloading.');
  const encoded=encodeURIComponent(file.downloadName).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(bytes,{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="document.pdf"; filename*=UTF-8''${encoded}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'none'",'Cross-Origin-Resource-Policy':'same-origin'}});
 }catch(error){return cmsErrorResponse(error instanceof CmsGatewayError?error:new CmsGatewayError(503,'Document download is temporarily unavailable.'));}
}
