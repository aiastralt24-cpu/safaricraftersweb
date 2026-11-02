import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {planContactFormMigration} from './contact-form-migration.ts';
import {contactMigrationDependencies} from './contact-migration.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),variant=z.enum(['contact','corporate']);
export const contactFormTargetsSchema=z.array(z.object({variant,recordId:uuid.nullable(),expectedRevision:uuid.nullable()}).strict()).length(2).refine(items=>items[0].variant==='contact'&&items[1].variant==='corporate'&&items.every(item=>Boolean(item.recordId)===Boolean(item.expectedRevision))&&(!items[0].recordId||items[0].recordId!==items[1].recordId));
export type ContactFormTargets=z.infer<typeof contactFormTargetsSchema>;
const reviewSchema=z.object({version:z.literal('contact-form-migration-review-1'),sourceDigest:digest,reviewDigest:digest,before:z.array(z.record(z.string(),z.unknown()).nullable()).length(2),proposal:z.unknown(),notice:z.string()}).strict();
export async function verifyContactFormReview(input:unknown,site:string,targets:ContactFormTargets){
 uuid.parse(site);const selected=contactFormTargetsSchema.parse(targets),value=reviewSchema.parse(input),plan=planContactFormMigration(contactMigrationDependencies);
 if(value.before.some((item,index)=>Boolean(item)!==Boolean(selected[index].recordId))||await hash(value.proposal)!==await hash(plan)||value.sourceDigest!==await hash(plan)||value.reviewDigest!==await hash({version:value.version,site,targets:selected,plan}))throw Error('Form migration review does not match the selected content and targets.');
 return {...value,proposal:plan};
}
export type ContactFormReview=Awaited<ReturnType<typeof verifyContactFormReview>>;
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,targets:contactFormTargetsSchema}).strict();
export type PendingContactForms=z.infer<typeof pendingSchema>;
export function contactFormRecoveryKey(site:string,actor:string){return `cms-contact-form-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingContactForms(text:string|null,site:string,actorId:string){if(text===null)return null;if(new TextEncoder().encode(text).length>5000)throw Error('Form recovery data is too large.');const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Form recovery belongs to another account or website.');return value;}
export function makePendingContactForms(site:string,actorId:string,targets:ContactFormTargets,review:ContactFormReview,requestKey:string){return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,targets});}
const result=z.array(z.object({variant,recordId:uuid,revisionId:uuid}).strict()).length(2).refine(items=>items[0].variant==='contact'&&items[1].variant==='corporate'&&items[0].recordId!==items[1].recordId);
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingContactForms){if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||value.result.some((item,i)=>(pending.targets[i].recordId&&item.recordId!==pending.targets[i].recordId)||item.revisionId===pending.targets[i].expectedRevision))throw Error('Form migration result does not match this request.');return value.result;}
export function verifyContactFormReceipt(input:unknown,pending:PendingContactForms){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyContactFormRecovery(input:unknown,pending:PendingContactForms){const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);return value.status==='unconfirmed'?null:identity(value,pending);}
export function contactFormApplyCommand(pending:PendingContactForms){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,targets:value.targets,requestKey:value.requestKey,reviewDigest:value.reviewDigest};}
