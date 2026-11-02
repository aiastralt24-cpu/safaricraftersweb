import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {miceMigrationDependencies,planMiceMigration} from './mice-migration.ts';
import {miceMediaEvidenceSchema,verifyMiceMigrationMedia} from './mice-migration-media.ts';
import {verifyMiceMigrationForm} from './mice-migration-form.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const miceMigrationSelectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),formId:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().min(1).max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(2)}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision)&&new Set(value.bindings.map(b=>b.assetId)).size===2&&new Set(value.bindings.map(b=>b.sourcePath)).size===2);
export type MiceMigrationSelection=z.infer<typeof miceMigrationSelectionSchema>;
const formEvidence=z.object({recordId:uuid,revisionId:uuid.nullable(),locale:z.string().nullable(),available:z.boolean()}).strict();
const publishedForm=formEvidence.extend({revisionId:uuid,locale:z.literal('en'),available:z.literal(true)});
const reviewSchema=z.object({version:z.literal('mice-migration-review-1'),selection:z.object({action:z.literal('review'),site:uuid}).extend(miceMigrationSelectionSchema.shape).strict(),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,metadata:object,verification:z.object({verified:z.boolean(),evidence:miceMediaEvidenceSchema,unavailable:z.array(z.string()).max(2)}).strict(),formEvidence:formEvidence.nullable(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type MiceMigrationReview=z.infer<typeof reviewSchema>;
const mediaBindings=(selection:MiceMigrationSelection)=>selection.bindings.map(({assetId,sourceSha256})=>({assetId,sourceSha256}));
/** Bind the full displayed proposal and evidence to this selection before allowing a save. */
export async function verifyMiceReview(input:unknown,site:string,selection:MiceMigrationSelection){
 uuid.parse(site);const selected=miceMigrationSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planMiceMigration(miceMigrationDependencies,selected.bindings,selected.formId);
 if(plan.missingMedia.length||await hash(value.selection)!==await hash({action:'review',site,...selected}))throw Error('MICE review selection changed.');
 const checked=verifyMiceMigrationMedia(mediaBindings(selected),value.verification.evidence);
 if(selected.formId)verifyMiceMigrationForm(selected.formId,value.formEvidence);else if(value.formEvidence!==null)throw Error('Unexpected corporate form evidence.');
 if(Boolean(value.before)!==Boolean(selected.recordId)||value.applyAvailable!==(checked.verified&&Boolean(value.formEvidence?.available))||await hash(value.verification)!==await hash(checked))throw Error('MICE review verification does not match this target.');
 const source=await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload});
 if(await hash(value.metadata)!==await hash(plan.metadata)||await hash(value.proposal)!==await hash(plan.previewPayload)||value.sourceDigest!==source||value.reviewDigest!==await hash({version:value.version,site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,source,verification:checked,formEvidence:value.formEvidence}))throw Error('MICE review content or identity changed.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:miceMigrationSelectionSchema,evidence:miceMediaEvidenceSchema,formEvidence:publishedForm}).strict().refine(value=>{try{return Boolean(value.selection.formId)&&verifyMiceMigrationMedia(mediaBindings(value.selection),value.evidence).verified&&verifyMiceMigrationForm(value.selection.formId!,value.formEvidence).available;}catch{return false;}});
export type PendingMiceMigration=z.infer<typeof pendingSchema>;
export function miceRecoveryKey(site:string,actor:string){return `cms-mice-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingMiceMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export async function makePendingMiceMigration(site:string,actorId:string,selection:MiceMigrationSelection,input:unknown,requestKey:string){
 const review=await verifyMiceReview(input,site,selection);
 if(!review.applyAvailable)throw Error('Resolve image and published form verification before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence,formEvidence:review.formEvidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingMiceMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('MICE migration result does not match this request.');return value.result;
}
export function verifyMiceReceipt(input:unknown,pending:PendingMiceMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyMiceRecovery(input:unknown,pending:PendingMiceMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function miceApplyCommand(pending:PendingMiceMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence,formEvidence:value.formEvidence};}
