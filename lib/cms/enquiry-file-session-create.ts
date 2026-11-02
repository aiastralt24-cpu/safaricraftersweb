import {createHash} from 'node:crypto';
import {z} from 'zod';
import {enquiryFileSessionScopeSchema,ENQUIRY_FILE_SESSION_TTL_MS} from './enquiry-file-session.ts';
export const enquiryFileSessionIdentitySchema=enquiryFileSessionScopeSchema.extend({session:z.string().uuid()}).strict();
export type EnquiryFileSessionIdentity=z.infer<typeof enquiryFileSessionIdentitySchema>;
const receiptSchema=enquiryFileSessionScopeSchema.extend({id:z.string().uuid(),createdAt:z.string().datetime({offset:true}),expiresAt:z.string().datetime({offset:true}),state:z.enum(['active','cancelled','consumed'])}).strict().refine(v=>Date.parse(v.expiresAt)>Date.parse(v.createdAt)&&Date.parse(v.expiresAt)-Date.parse(v.createdAt)<=ENQUIRY_FILE_SESSION_TTL_MS);
export type EnquiryFileSessionCreateAdapter={consumeRate():Promise<unknown>;verifyChallenge(token:string):Promise<boolean>;lookup(identity:EnquiryFileSessionIdentity,tokenHash:string):Promise<unknown>;create(identity:EnquiryFileSessionIdentity,tokenHash:string):Promise<unknown>};
export function checkEnquiryFileSessionReceipt(raw:unknown,i:EnquiryFileSessionIdentity){const receipt=receiptSchema.parse(raw);if(receipt.id!==i.session||receipt.site!==i.site||receipt.form!==i.form||receipt.revision!==i.revision||receipt.request!==i.request)throw Error('Upload session receipt mismatch.');return receipt;}
/** The client creates and retains a cryptographically random 256-bit secret BEFORE
 * sending. Recovery proves possession of that same secret; never rotate on retry.
 * Existing expired/terminal receipts are returned for recovery, not authorization. */
export async function createEnquiryFileSession(adapter:EnquiryFileSessionCreateAdapter,input:unknown,token:unknown,challenge:unknown){
 const identity=enquiryFileSessionIdentitySchema.parse(input),secret=z.string().regex(/^[a-f0-9]{64}$/).parse(token);
 const rate=z.object({allowed:z.boolean(),retryAfter:z.number().int().min(1).max(600)}).strict().parse(await adapter.consumeRate());
 if(!rate.allowed)return {status:'rate_limited' as const,retryAfter:rate.retryAfter};
 const hash=createHash('sha256').update(secret).digest('hex');
 const existing=await adapter.lookup(identity,hash);
 if(existing!==null)return {status:'recovered' as const,session:checkEnquiryFileSessionReceipt(existing,identity)};
 const proof=z.string().min(1).max(2048).safeParse(challenge);
 if(!proof.success||!await adapter.verifyChallenge(proof.data))return {status:'challenge_required' as const};
 return {status:'created' as const,session:checkEnquiryFileSessionReceipt(await adapter.create(identity,hash),identity)};
}
