import {z} from 'zod';
export function parseTestimonialSnapshot(text:string){
 if(new TextEncoder().encode(text).length>1_000_000)throw Error('Choose a JSON export under 1 MB.');
 let input:unknown;try{input=JSON.parse(text);}catch{throw Error('Choose a valid JSON snapshot.');}
 const value=Array.isArray(input)?input:input&&typeof input==='object'&&'testimonials' in input?input.testimonials:undefined;
 return z.array(z.record(z.string(),z.unknown())).min(1).max(100).parse(value);
}
const issue=z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()});
export const migrationReviewSchema=z.object({reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),plan:z.object({count:z.number().int().min(1).max(100),readyDrafts:z.number().int().min(0).max(100),unusedMappings:z.array(z.string()),candidates:z.array(z.object({sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),sourceIndex:z.number().int(),canSaveDraft:z.boolean(),source:z.record(z.string(),z.unknown()),payload:z.record(z.string(),z.unknown()),issues:z.array(issue)})).max(100)})});
export function verifyMigrationReceipt(input:unknown,digests:string[]){
 const value=z.object({result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string()}).passthrough())}).parse(input);
 const keys=value.result.map(item=>item.sourceKey);
 if(keys.length!==digests.length||new Set(keys).size!==keys.length||new Set(value.result.map(item=>item.recordId)).size!==keys.length||digests.some(digest=>!keys.includes(`testimonial_${digest}`)))throw Error('Migration receipt does not match the reviewed records.');
 return value.result;
}
