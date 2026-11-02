import {z} from 'zod';
import {image} from './composition.ts';
import {journalArticleSchema} from './journal.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
const mappingsSchema=z.record(z.string(),z.object({images:z.record(z.string(),image)}).strict());
function parseJson(text:string,limit:number){
 if(new TextEncoder().encode(text).length>limit)throw Error(`Choose a file smaller than ${limit/1000} KB.`);
 try{return JSON.parse(text) as unknown;}catch{throw Error('Choose a valid JSON file.');}
}
export function parseJournalSnapshot(text:string){
 const input=parseJson(text,1_000_000);
 const records=Array.isArray(input)?input:input&&typeof input==='object'&&'journal' in input?input.journal:undefined;
 return z.array(object).min(1).max(25).parse(records);
}
export function parseJournalMappings(text:string){return mappingsSchema.parse(parseJson(text,500_000));}
function canonical(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
// Browser-native hashing matches the server planner without bundling node:crypto.
export async function journalSourceDigest(value:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');}
const candidateSchema=z.object({sourceIndex:z.number().int().min(0),sourceKey:z.string(),sourceDigest:digest,source:object,mappings:z.object({images:z.record(z.string(),image)}).strict(),payload:object,heroSourcePath:z.string(),retainedGalleryPaths:z.array(z.string()),issues:z.array(z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()}).strict()),canSaveDraft:z.boolean()}).strict();
export const journalReviewSchema=z.object({applyAvailable:z.boolean(),reviewDigest:digest,verification:z.object({media:z.literal(true)}).strict(),plan:z.object({version:z.literal(1),operation:z.literal('review_only'),sourceDigest:digest,count:z.number().int().min(1).max(25),readyDrafts:z.number().int().min(0).max(25),unusedMappings:z.array(z.string()),candidates:z.array(candidateSchema).min(1).max(25)}).strict()}).strict();
export type JournalMigrationReview=z.infer<typeof journalReviewSchema>;
export async function verifyJournalReview(input:unknown,source:Record<string,unknown>[],mappings:unknown){
 const review=journalReviewSchema.parse(input),maps=mappingsSchema.parse(mappings),plan=review.plan;
 const digests=await Promise.all(source.map(journalSourceDigest));
 if(plan.count!==source.length||plan.candidates.length!==source.length||plan.sourceDigest!==await journalSourceDigest(source))throw Error('Review does not match this source snapshot.');
 for(const [index,candidate] of plan.candidates.entries()){
  const key=`snapshot:${digests[index]}`;
  if(candidate.sourceIndex!==index||candidate.sourceDigest!==digests[index]||candidate.sourceKey!==key||canonical(candidate.source)!==canonical(source[index])||canonical(candidate.mappings)!==canonical(maps[key]??{images:{}}))throw Error('Review does not match this source and image mapping.');
  if(candidate.canSaveDraft&&(!journalArticleSchema.safeParse(candidate.payload).success||candidate.issues.some(issue=>issue.severity==='error')))throw Error('Review contains an invalid ready draft.');
 }
 const unused=Object.keys(maps).filter(key=>!digests.some(hash=>key===`snapshot:${hash}`)).sort();
 const ready=plan.candidates.filter(item=>item.canSaveDraft).length;
 if(canonical([...plan.unusedMappings].sort())!==canonical(unused)||plan.readyDrafts!==ready||review.applyAvailable!==(ready===plan.count&&!unused.length))throw Error('Review readiness is inconsistent.');
 return review;
}
const resultSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string().regex(/^journal_[a-f0-9]{64}$/)}).passthrough()).min(1).max(25);
export function verifyJournalReceipt(input:unknown,digests:string[]){
 const result=z.object({result:resultSchema}).parse(input).result,keys=result.map(item=>item.sourceKey);
 if(new Set(digests).size!==digests.length||keys.length!==digests.length||new Set(keys).size!==keys.length||new Set(result.map(item=>item.recordId)).size!==keys.length||new Set(result.map(item=>item.revisionId)).size!==keys.length||digests.some(hash=>!keys.includes(`journal_${hash}`)))throw Error('Migration receipt does not match every reviewed article.');
 return result;
}
export const pendingJournalMigrationSchema=z.object({version:z.literal(1),site:z.string().uuid(),actorId:z.string().uuid(),requestKey:z.string().uuid(),reviewDigest:digest,sourceDigest:digest,sourceDigests:z.array(digest).min(1).max(25).refine(values=>new Set(values).size===values.length)}).strict();
export type PendingJournalMigration=z.infer<typeof pendingJournalMigrationSchema>;
export function journalRecoveryKey(site:string,actorId:string){return `cms-journal-migration:${z.string().uuid().parse(site)}:${z.string().uuid().parse(actorId)}`;}
export function readPendingJournalMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;
 const value=pendingJournalMigrationSchema.parse(parseJson(text,10_000));
 if(value.site!==site||value.actorId!==actorId)throw Error('Saved migration belongs to another website or account.');
 return value;
}
export function verifyJournalRecovery(input:unknown,pending:PendingJournalMigration){
 const response=z.discriminatedUnion('status',[
  z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),
  z.object({status:z.literal('complete'),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:resultSchema}).strict()
 ]).parse(input);
 if(response.status==='unconfirmed')return null;
 if(response.requestKey!==pending.requestKey||response.sourceDigest!==pending.sourceDigest||response.reviewDigest!==pending.reviewDigest)throw Error('Recovery does not match the saved migration request.');
 return verifyJournalReceipt(response,pending.sourceDigests);
}
/** Select only an asset identity; legacy attribution and meaning remain unchanged. */
export function journalImageMapping(sourceImage:unknown,assetId:string){
 const legacy=z.object({src:z.string().min(1),alt:z.string(),credit:z.string()}).strict().parse(sourceImage);
 return image.parse({assetId,alt:legacy.alt,credit:legacy.credit,decorative:false});
}
