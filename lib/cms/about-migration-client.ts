import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {aboutMigrationDependencies,planAboutMigration} from './about-migration.ts';
import {aboutMediaEvidenceSchema,verifyAboutMigrationMedia} from './about-migration-media.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const aboutMigrationSelectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().min(1).max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(4)}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision)&&new Set(value.bindings.map(b=>b.assetId)).size===4&&new Set(value.bindings.map(b=>b.sourcePath)).size===4);
export type AboutMigrationSelection=z.infer<typeof aboutMigrationSelectionSchema>;
const reviewSchema=z.object({version:z.literal('about-migration-review-1'),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,verification:z.object({verified:z.boolean(),evidence:aboutMediaEvidenceSchema,unavailable:z.array(z.string()).max(4)}).strict(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type AboutMigrationReview=z.infer<typeof reviewSchema>;
export async function verifyAboutReview(input:unknown,site:string,selection:AboutMigrationSelection){
 uuid.parse(site);const selected=aboutMigrationSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planAboutMigration(aboutMigrationDependencies,selected.bindings);
 const checked=verifyAboutMigrationMedia(selected.bindings,value.verification.evidence);
 if(Boolean(value.before)!==Boolean(selected.recordId)||value.applyAvailable!==checked.verified||await hash(value.verification)!==await hash(checked))throw Error('About review verification does not match this target.');
 if(await hash(value.proposal)!==await hash(plan.previewPayload)||value.sourceDigest!==await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload})||value.reviewDigest!==await hash({version:value.version,site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,plan,evidence:checked.evidence}))throw Error('About review content or identity changed.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:aboutMigrationSelectionSchema,evidence:aboutMediaEvidenceSchema}).strict().refine(value=>{try{return verifyAboutMigrationMedia(value.selection.bindings,value.evidence).verified;}catch{return false;}});
export type PendingAboutMigration=z.infer<typeof pendingSchema>;
export function aboutRecoveryKey(site:string,actor:string){return `cms-about-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingAboutMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function makePendingAboutMigration(site:string,actorId:string,selection:AboutMigrationSelection,review:AboutMigrationReview,requestKey:string){
 if(!review.applyAvailable)throw Error('Resolve image verification before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingAboutMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('About migration result does not match this request.');return value.result;
}
export function verifyAboutReceipt(input:unknown,pending:PendingAboutMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyAboutRecovery(input:unknown,pending:PendingAboutMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function aboutApplyCommand(pending:PendingAboutMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
