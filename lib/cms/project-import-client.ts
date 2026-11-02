import {z} from 'zod';
import {projectSchema} from './projects.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const target=z.object({sourceKey:z.string().regex(/^project_import_[a-f0-9]{64}$/),recordId:z.string().uuid().nullable()}).strict();
export const pendingProjectImportSchema=z.object({version:z.literal(1),actorId:z.string().uuid(),site:z.string().uuid(),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,targets:z.array(target).min(1).max(25)}).strict();
export type PendingProjectImport=z.infer<typeof pendingProjectImportSchema>;
export function verifyProjectImportCancellation(input:unknown,pending:PendingProjectImport){
 const value=z.object({status:z.literal('cancelled'),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest}).strict().parse(input);
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest)throw Error('Cancellation does not match this reviewed import. Keep the request ID and check again.');
 return value;
}
export const projectImportReviewSchema=z.object({comparisons:z.array(z.object({importId:z.string(),revision:z.string().uuid().nullable(),before:projectSchema.nullable()}).strict()).max(25),source:z.object({format:z.enum(['xlsx','docx']),sha256:digest,bytes:z.number().int().positive().max(5_000_000)}),reviewDigest:digest,applyAvailable:z.boolean(),verification:z.object({currentRecords:z.boolean(),media:z.boolean(),references:z.boolean()}),plan:z.object({valid:z.boolean(),issues:z.array(z.object({sheet:z.string(),row:z.number().int(),field:z.string(),code:z.string(),severity:z.enum(['error','warning']),message:z.string()})),changes:z.array(z.object({importId:z.string(),operation:z.enum(['create','update']),recordId:z.string().uuid().nullable(),expectedRevision:z.string().uuid().nullable(),locale:z.string(),path:z.string(),payload:projectSchema,replacedCollections:z.array(z.string())})).max(25)})});
export async function importSha256(bytes:BufferSource){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function verifyProjectImportReview(input:unknown,source:{hash:string;size:number;format:string}){
 const value=projectImportReviewSchema.parse(input);
 if(value.source.sha256!==source.hash||value.source.bytes!==source.size||value.source.format!==source.format)throw Error('Review does not match the selected file.');
 if(value.applyAvailable&&(!value.plan.valid||!value.plan.changes.length||value.plan.issues.some(i=>i.severity==='error')||!value.verification.currentRecords||!value.verification.media||!value.verification.references))throw Error('Review readiness is inconsistent.');
 for(const change of value.plan.changes){if(change.path!==`/projects/${change.payload.slug}`||(change.operation==='create'?(change.recordId!==null||change.expectedRevision!==null):(!change.recordId||!change.expectedRevision||change.recordId!==change.importId)))throw Error('Review contains an inconsistent project identity.');}
 if(value.comparisons.length!==value.plan.changes.length||new Set(value.comparisons.map(row=>row.importId)).size!==value.comparisons.length)throw Error('Review comparison coverage is incomplete.');
 for(const change of value.plan.changes){const comparison=value.comparisons.find(row=>row.importId===change.importId);if(!comparison||comparison.revision!==change.expectedRevision||(change.operation==='create'?comparison.before!==null:comparison.before===null||comparison.before.slug!==change.payload.slug))throw Error('Review comparison does not match the saved project revision.');}
 const ids=value.plan.changes.map(c=>c.importId);if(new Set(ids).size!==ids.length)throw Error('Review contains duplicate projects.');
 return value;
}
export function readPendingProjectImport(text:string|null,site:string,actorId:string){
 if(text===null)return null;
 if(text.length>20_000)throw Error('Saved import recovery data is invalid.');
 const value=pendingProjectImportSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId||new Set(value.targets.map(t=>t.sourceKey)).size!==value.targets.length)throw Error('Saved import recovery does not match this website.');return value;
}
export function verifyProjectImportReceipt(input:unknown,pending:PendingProjectImport){
 const value=z.object({requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string()}).strict()).min(1).max(25)}).parse(input);
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||value.result.length!==pending.targets.length||new Set(value.result.map(r=>r.recordId)).size!==value.result.length||new Set(value.result.map(r=>r.sourceKey)).size!==value.result.length||value.result.some(r=>!pending.targets.some(t=>t.sourceKey===r.sourceKey&&(t.recordId===null||t.recordId===r.recordId))))throw Error('Save receipt does not match this reviewed import. Keep the request ID and check again.');
 return value.result;
}
