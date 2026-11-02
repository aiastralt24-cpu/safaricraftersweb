import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {guidedMigrationDependencies,planGuidedSafarisMigration} from './guided-safaris-migration.ts';
import {guidedMediaEvidenceSchema,verifyGuidedMigrationMedia} from './guided-migration-media.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const guidedMigrationSelectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().min(1).max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(8)}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision)&&new Set(value.bindings.map(b=>b.assetId)).size===8&&new Set(value.bindings.map(b=>b.sourcePath)).size===8);
export type GuidedMigrationSelection=z.infer<typeof guidedMigrationSelectionSchema>;
const reviewSchema=z.object({version:z.literal('guided-migration-review-1'),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,verification:z.object({verified:z.boolean(),evidence:guidedMediaEvidenceSchema,unavailable:z.array(z.string()).max(8)}).strict(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type GuidedMigrationReview=z.infer<typeof reviewSchema>;
export async function verifyGuidedReview(input:unknown,site:string,selection:GuidedMigrationSelection){
 uuid.parse(site);const selected=guidedMigrationSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planGuidedSafarisMigration(guidedMigrationDependencies,selected.bindings);
 if(plan.missingMedia.length)throw Error('Bespoke image mappings are incomplete.');
 const checked=verifyGuidedMigrationMedia(selected.bindings,value.verification.evidence);
 if(Boolean(value.before)!==Boolean(selected.recordId)||value.applyAvailable!==checked.verified||await hash(value.verification)!==await hash(checked))throw Error('Guided review verification does not match this target.');
 if(await hash(value.proposal)!==await hash(plan.previewPayload)||value.sourceDigest!==await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload})||value.reviewDigest!==await hash({version:value.version,site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,plan,evidence:checked.evidence}))throw Error('Guided review content or identity changed.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:guidedMigrationSelectionSchema,evidence:guidedMediaEvidenceSchema}).strict().refine(value=>{try{return verifyGuidedMigrationMedia(value.selection.bindings,value.evidence).verified;}catch{return false;}});
export type PendingGuidedMigration=z.infer<typeof pendingSchema>;
export function guidedRecoveryKey(site:string,actor:string){return `cms-guided-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingGuidedMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function makePendingGuidedMigration(site:string,actorId:string,selection:GuidedMigrationSelection,review:GuidedMigrationReview,requestKey:string){
 if(!review.applyAvailable)throw Error('Resolve image verification before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingGuidedMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('Guided migration result does not match this request.');return value.result;
}
export function verifyGuidedReceipt(input:unknown,pending:PendingGuidedMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyGuidedRecovery(input:unknown,pending:PendingGuidedMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function guidedApplyCommand(pending:PendingGuidedMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
