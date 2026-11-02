import {createHash} from 'node:crypto';
import {z} from 'zod';
import {bearerToken,cmsRpc,CmsGatewayError,privateHeaders,cmsErrorResponse} from './gateway.ts';
const uuid=z.string().uuid();
const descriptor=z.object({site:uuid,lead:uuid,upload:uuid,request:uuid,key:z.string().max(250),filename:z.string().min(1).max(200).refine(v=>!/[\x00-\x1f\x7f/\\]/.test(v)),mime:z.enum(['application/pdf','image/webp']),bytes:z.number().int().min(1).max(25000000),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
type File=z.infer<typeof descriptor>;
export type LeadAttachmentDownloadAdapter={site:string;authorize:(token:string,lead:string,upload:string)=>Promise<unknown>;audit:(token:string,file:File)=>Promise<unknown>;read:(file:File)=>Promise<Response>};
function checkedFile(input:unknown,site:string,lead:string,upload:string){
 const file=descriptor.parse(input);
 if(file.site!==site||file.lead!==lead||file.upload!==upload||file.key!==`${site}/enquiries/${file.request}/${upload}/delivery.${file.mime==='application/pdf'?'pdf':'webp'}`)throw Error('Attachment identity mismatch.');
 return file;
}
export function createLeadAttachmentDownloadAdapter(config:{url:string;anonKey:string;serviceKey:string;site:string},fetcher:typeof fetch=fetch):LeadAttachmentDownloadAdapter{
 const origin=new URL(config.url);uuid.parse(config.site);
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!config.anonKey||!config.serviceKey)throw Error('Attachment delivery is unavailable.');
 return {site:config.site,
  authorize:(token,lead,upload)=>cmsRpc({url:config.url,key:config.anonKey},token,'get_lead_attachment_download',{p_site:config.site,p_lead:lead,p_upload:upload},fetcher),
  audit:(token,file)=>cmsRpc({url:config.url,key:config.anonKey},token,'audit_lead_attachment_download',{p_site:config.site,p_lead:file.lead,p_upload:file.upload,p_sha256:file.sha256},fetcher),
  read:async input=>{const file=checkedFile(input,config.site,input.lead,input.upload);return fetcher(new URL(`/storage/v1/object/authenticated/cms-enquiry-files/${file.key}`,origin),{headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});},
 };
}
export function leadAttachmentDownloadConfig(env:Record<string,string|undefined>=process.env){
 if(env.CMS_ENQUIRY_FILES_ENABLED!=='true')return null;
 try{return createLeadAttachmentDownloadAdapter({url:env.CMS_SUPABASE_URL??'',anonKey:env.CMS_SUPABASE_ANON_KEY??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??'',site:env.CMS_WEBSITE_ID??''});}catch{return null;}
}
export async function handleLeadAttachmentDownload(request:Request,backend:LeadAttachmentDownloadAdapter|null=leadAttachmentDownloadConfig()){
 try{
  if(request.method!=='GET')throw new CmsGatewayError(405,'Use GET.');
  const token=bearerToken(request.headers.get('authorization'));
  if(!backend)throw new CmsGatewayError(404,'Attachment download is unavailable.');
  const params=new URL(request.url).searchParams,query=z.object({lead:uuid,upload:uuid}).strict().safeParse(Object.fromEntries(params));
  if(!query.success||Array.from(params).length!==2)throw new CmsGatewayError(400,'Choose an attachment.');
  const {lead,upload}=query.data;
  const raw=await backend.authorize(token,lead,upload);if(raw===null)throw new CmsGatewayError(404,'Attachment download is unavailable.');
  const file=checkedFile(raw,backend.site,lead,upload),response=await backend.read(file),length=response.headers.get('content-length');
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!==file.mime||length!==null&&(!/^\d+$/.test(length)||Number(length)!==file.bytes))throw Error('Attachment verification failed.');
  const reader=response.body?.getReader();if(!reader)throw Error('Attachment verification failed.');
  const bytes=new Uint8Array(file.bytes);let offset=0,timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Attachment transfer timed out.')),30000);});
  try{while(true){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;if(offset+part.value.length>bytes.length)throw Error('Attachment verification failed.');bytes.set(part.value,offset);offset+=part.value.length;}}
  catch(error){void reader.cancel().catch(()=>{});throw error;}finally{clearTimeout(timer);reader.releaseLock();}
  if(offset!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Attachment verification failed.');
  // Recheck the user's current permissions after the storage read; possession of
  // an old metadata response must not survive permission revocation. The same
  // transaction records authorization before any bytes leave this handler.
  const latest=checkedFile(await backend.audit(token,file),backend.site,lead,upload);
  if(JSON.stringify(latest)!==JSON.stringify(file))throw Error('Attachment authorization changed.');
  const ext=file.mime==='application/pdf'?'pdf':'webp',name=file.filename.replace(/\.[^.]+$/,'')+`.${ext}`,encoded=encodeURIComponent(name).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(bytes,{headers:{...privateHeaders,'Content-Type':file.mime,'Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="attachment.${ext}"; filename*=UTF-8''${encoded}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'none'",'Cross-Origin-Resource-Policy':'same-origin'}});
 }catch(error){return cmsErrorResponse(error instanceof CmsGatewayError?error:new CmsGatewayError(503,'Attachment download could not be verified.'));}
}
