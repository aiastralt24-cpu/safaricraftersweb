import {z} from 'zod';
import {destinationSchema} from './destinations.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const target=z.object({sourceKey:z.string().regex(/^destination_import_[a-f0-9]{64}$/),recordId:z.string().uuid().nullable()}).strict();
export const pendingDestinationImportSchema=z.object({site:z.string().uuid(),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,targets:z.array(target).min(1).max(25)}).strict();
export type PendingDestinationImport=z.infer<typeof pendingDestinationImportSchema>;
export const destinationImportReviewSchema=z.object({source:z.object({format:z.enum(['xlsx','docx']),sha256:digest,bytes:z.number().int().positive().max(5_000_000)}),reviewDigest:digest,applyAvailable:z.boolean(),verification:z.object({currentRecords:z.boolean(),mediaAndReferences:z.boolean()}),plan:z.object({valid:z.boolean(),issues:z.array(z.object({sheet:z.string(),row:z.number().int(),field:z.string(),code:z.string(),severity:z.enum(['error','warning']),message:z.string()})),changes:z.array(z.object({importId:z.string(),operation:z.enum(['create','update']),recordId:z.string().uuid().nullable(),expectedRevision:z.string().uuid().nullable(),locale:z.string(),path:z.string(),payload:destinationSchema,replacedCollections:z.array(z.string())})).max(25)})});
export async function importSha256(bytes:BufferSource){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function verifyDestinationImportReview(input:unknown,source:{hash:string;size:number;format:string}){
 const value=destinationImportReviewSchema.parse(input);
 if(value.source.sha256!==source.hash||value.source.bytes!==source.size||value.source.format!==source.format)throw Error('Review does not match the selected file.');
 if(value.applyAvailable&&(!value.plan.valid||!value.plan.changes.length||value.plan.issues.some(i=>i.severity==='error')||!value.verification.currentRecords||!value.verification.mediaAndReferences))throw Error('Review readiness is inconsistent.');
 const ids=value.plan.changes.map(c=>c.importId);if(new Set(ids).size!==ids.length)throw Error('Review contains duplicate destinations.');
 return value;
}
export function readPendingDestinationImport(text:string|null,site:string){
 if(text===null)return null;
 if(text.length>20_000)throw Error('Saved import recovery data is invalid.');
 const value=pendingDestinationImportSchema.parse(JSON.parse(text));if(value.site!==site||new Set(value.targets.map(t=>t.sourceKey)).size!==value.targets.length)throw Error('Saved import recovery does not match this website.');return value;
}
export function verifyDestinationImportReceipt(input:unknown,pending:PendingDestinationImport){
 const value=z.object({requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string()}).strict()).min(1).max(25)}).parse(input);
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||value.result.length!==pending.targets.length||new Set(value.result.map(r=>r.recordId)).size!==value.result.length||new Set(value.result.map(r=>r.sourceKey)).size!==value.result.length||value.result.some(r=>!pending.targets.some(t=>t.sourceKey===r.sourceKey&&(t.recordId===null||t.recordId===r.recordId))))throw Error('Save receipt does not match this reviewed import. Keep the request ID and check again.');
 return value.result;
}
