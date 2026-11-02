import {createHash} from 'node:crypto';
import {z} from 'zod';
import {enquiryFileSessionScopeSchema} from './enquiry-file-session.ts';
const uuid=z.string().uuid();
export const enquiryFileTransferIdentitySchema=enquiryFileSessionScopeSchema.extend({session:uuid,upload:uuid}).strict();
export type EnquiryFileTransferIdentity=z.infer<typeof enquiryFileTransferIdentitySchema>;
const receiptSchema=z.object({id:uuid,site:uuid,form:uuid,revision:uuid,request:uuid,field:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),filename:z.string().min(1).max(200),mime:z.enum(['application/pdf','image/jpeg','image/png']),bytes:z.number().int().min(1).max(25000000),maxBytes:z.number().int().min(1).max(25000000),sha256:z.string().regex(/^[a-f0-9]{64}$/),state:z.enum(['reserved','uploaded','processing','retry','rejected','ready']),storageKey:z.string(),deliveryKey:z.string()}).strict();
export type EnquiryFileTransfer=z.infer<typeof receiptSchema>;
export type EnquiryFileTransferAdapter={
 authorize(identity:EnquiryFileTransferIdentity,tokenHash:string):Promise<unknown>;
 put(transfer:EnquiryFileTransfer,bytes:Buffer):Promise<void>;
 confirm(identity:EnquiryFileTransferIdentity,tokenHash:string,sha256:string,bytes:number):Promise<unknown>;
};
export function checkEnquiryFileTransfer(raw:unknown,identity:EnquiryFileTransferIdentity){
 const value=receiptSchema.parse(raw),base=`${identity.site}/enquiries/${identity.request}/${identity.upload}`;
 if(value.id!==identity.upload||value.site!==identity.site||value.form!==identity.form||value.revision!==identity.revision||value.request!==identity.request||value.bytes>value.maxBytes||value.storageKey!==`${base}/original`||value.deliveryKey!==`${base}/delivery.${value.mime==='application/pdf'?'pdf':'webp'}`)throw Error('Attachment transfer identity mismatch.');
 return value;
}
/** Server only. The HTTP caller must bound/authorize the request before buffering.
 * Authorization and confirmation both recheck the session in the database. */
export async function transferEnquiryFile(adapter:EnquiryFileTransferAdapter,input:EnquiryFileTransferIdentity,token:string,bytes:Uint8Array,mime:string){
 const identity=enquiryFileTransferIdentitySchema.parse(input);
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>25000000)throw Error('Invalid attachment transfer.');
 const tokenHash=createHash('sha256').update(token).digest('hex');
 const transfer=checkEnquiryFileTransfer(await adapter.authorize(identity,tokenHash),identity);
 if(transfer.state==='rejected')throw Error('Attachment was rejected.');
 // Copy before awaiting storage so a caller cannot mutate the verified bytes.
 const body=Buffer.from(bytes);
 if(body.length!==transfer.bytes||mime!==transfer.mime||createHash('sha256').update(body).digest('hex')!==transfer.sha256)throw Error('Attachment bytes do not match the reservation.');
 await adapter.put(transfer,body);
 const confirmed=checkEnquiryFileTransfer(await adapter.confirm(identity,tokenHash,transfer.sha256,body.length),identity);
 const {state:_,...before}=transfer,{state:__,...after}=confirmed;
 if(JSON.stringify(before)!==JSON.stringify(after)||confirmed.state==='reserved'||confirmed.state==='rejected')throw Error('Attachment confirmation mismatch.');
 return {uploadId:identity.upload,status:confirmed.state==='ready'?'ready' as const:'awaiting_verification' as const};
}
