/** Server-only attachment credentials. Persist hashes, never bearer tokens. */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {formSchema} from './forms.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
export const enquiryFileSessionScopeSchema=z.object({site:uuid,form:uuid,revision:uuid,request:uuid}).strict();
export type EnquiryFileSessionScope=z.infer<typeof enquiryFileSessionScopeSchema>;
export const ENQUIRY_FILE_SESSION_TTL_MS=30*60*1000;
export const enquiryFileSessionSchema=enquiryFileSessionScopeSchema.extend({id:uuid,tokenHash:digest,createdAt:z.string().datetime({offset:true}),expiresAt:z.string().datetime({offset:true}),state:z.enum(['active','cancelled','consumed'])}).strict().refine(v=>Date.parse(v.expiresAt)>Date.parse(v.createdAt)&&Date.parse(v.expiresAt)-Date.parse(v.createdAt)<=ENQUIRY_FILE_SESSION_TTL_MS);
const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
export function createEnquiryFileCredential(){
 const token=randomBytes(32).toString('hex');
 return {token,tokenHash:createHash('sha256').update(token).digest('hex')};
}
/** The session and form definition must come from the trusted store. A successful
 * check is not a reservation: storage mutations must repeat it transactionally. */
export function authorizeEnquiryFileSession(raw:unknown,scope:EnquiryFileSessionScope,token:unknown,now=Date.now()){
 const session=enquiryFileSessionSchema.safeParse(raw),expected=enquiryFileSessionScopeSchema.safeParse(scope),secret=tokenSchema.safeParse(token);
 if(!session.success||!expected.success||!secret.success||!Number.isFinite(now))return null;
 const value=session.data;
 if(value.state!=='active'||Date.parse(value.createdAt)>now||Date.parse(value.expiresAt)<=now||Object.entries(expected.data).some(([key,v])=>value[key as keyof EnquiryFileSessionScope]!==v))return null;
 const supplied=createHash('sha256').update(secret.data).digest();
 if(!timingSafeEqual(supplied,Buffer.from(value.tokenHash,'hex')))return null;
 // Do not return the credential hash to upload handlers or public responses.
 const {tokenHash:_,...authorized}=value;return authorized;
}
export const enquiryFileReservationSchema=z.object({field:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),filename:z.string().min(1).max(200).refine(v=>!v.startsWith('.')&&!/[\x00-\x1f\x7f/\\]/.test(v)),mime:z.enum(['application/pdf','image/jpeg','image/png']),bytes:z.number().int().positive().max(25_000_000),sha256:digest}).strict();
/** Resolve exact file-field policy from a trusted, pinned form revision. File
 * visibility/requiredness is checked again with final submitted answers. */
export function resolveEnquiryFilePolicy(definition:unknown,input:unknown){
 const form=formSchema.safeParse(definition),upload=enquiryFileReservationSchema.safeParse(input);
 if(!form.success||!upload.success)return null;
 const field=form.data.fields.find(v=>v.id===upload.data.field);
 if(!field||field.type!=='file'||!field.mimeTypes.includes(upload.data.mime)||upload.data.bytes>field.maxBytes)return null;
 const extensions={'application/pdf':/\.pdf$/i,'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i};
 if(!extensions[upload.data.mime].test(upload.data.filename))return null;
 return {...upload.data,maxBytes:field.maxBytes};
}
