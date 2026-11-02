import {z} from 'zod';
export const leadAttachmentsSchema=z.array(z.object({uploadId:z.string().uuid(),fieldId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),filename:z.string().min(1).max(200).refine(v=>!/[\x00-\x1f\x7f/\\]/.test(v)),mime:z.enum(['application/pdf','image/webp']),bytes:z.number().int().min(1).max(25000000),canDownload:z.boolean(),availability:z.enum(['available','deleting','deleted']).optional()}).strict().refine(v=>!v.availability||v.availability==='available'||!v.canDownload)).max(50).refine(v=>new Set(v.map(f=>f.uploadId)).size===v.length&&new Set(v.map(f=>f.fieldId)).size===v.length);
export type LeadAttachment=z.infer<typeof leadAttachmentsSchema>[number];
export async function readLeadAttachmentResponse(response:Response,file:LeadAttachment){
 if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim()!==file.mime)throw Error('Attachment download is unavailable. Refresh the list and try again.');
 const length=response.headers.get('content-length');if(length!==null&&length!==String(file.bytes))throw Error('Attachment download changed. Refresh before downloading.');
 const reader=response.body?.getReader();if(!reader)throw Error('Attachment download is empty.');const data=new Uint8Array(file.bytes);let offset=0;
 try{while(true){const part=await reader.read();if(part.done)break;if(offset+part.value.length>data.length)throw Error('Attachment download changed.');data.set(part.value,offset);offset+=part.value.length;}}catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 if(offset!==data.length)throw Error('Attachment download was interrupted.');
 return {blob:new Blob([data],{type:file.mime}),filename:file.filename.replace(/\.[^.]+$/,'')+(file.mime==='application/pdf'?'.pdf':'.webp')};
}
