import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {conservationMigrationDependencies,planConservationMigration} from './conservation-migration.ts';
import {conservationMediaEvidenceSchema,verifyConservationMigrationMedia} from './conservation-migration-media.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const conservationMigrationSelectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().min(1).max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(5)}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision)&&new Set(value.bindings.map(b=>b.assetId)).size===5&&new Set(value.bindings.map(b=>b.sourcePath)).size===5);
export type ConservationMigrationSelection=z.infer<typeof conservationMigrationSelectionSchema>;
const reviewSchema=z.object({version:z.literal('conservation-migration-review-1'),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,verification:z.object({verified:z.boolean(),evidence:conservationMediaEvidenceSchema,unavailable:z.array(z.string()).max(5)}).strict(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type ConservationMigrationReview=z.infer<typeof reviewSchema>;
export async function verifyConservationReview(input:unknown,site:string,selection:ConservationMigrationSelection){
 uuid.parse(site);const selected=conservationMigrationSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planConservationMigration(conservationMigrationDependencies,selected.bindings);
 const checked=verifyConservationMigrationMedia(selected.bindings,value.verification.evidence);
 if(Boolean(value.before)!==Boolean(selected.recordId)||value.applyAvailable!==checked.verified||await hash(value.verification)!==await hash(checked))throw Error('Conservation review verification does not match this target.');
 if(await hash(value.proposal)!==await hash(plan.previewPayload)||value.sourceDigest!==await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload})||value.reviewDigest!==await hash({version:value.version,site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,plan,evidence:checked.evidence}))throw Error('Conservation review content or identity changed.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:conservationMigrationSelectionSchema,evidence:conservationMediaEvidenceSchema}).strict().refine(value=>{try{return verifyConservationMigrationMedia(value.selection.bindings,value.evidence).verified;}catch{return false;}});
export type PendingConservationMigration=z.infer<typeof pendingSchema>;
export function conservationRecoveryKey(site:string,actor:string){return `cms-conservation-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingConservationMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function makePendingConservationMigration(site:string,actorId:string,selection:ConservationMigrationSelection,review:ConservationMigrationReview,requestKey:string){
 if(!review.applyAvailable)throw Error('Resolve image verification before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingConservationMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('Conservation migration result does not match this request.');return value.result;
}
export function verifyConservationReceipt(input:unknown,pending:PendingConservationMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyConservationRecovery(input:unknown,pending:PendingConservationMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function conservationApplyCommand(pending:PendingConservationMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
