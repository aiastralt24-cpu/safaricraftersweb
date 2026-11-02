import {z} from 'zod';
const digest=z.string().regex(/^[a-f0-9]{64}$/),asset=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const aviationMediaBindingsSchema=z.array(z.object({kind:z.enum(['image','video']),assetId:asset,sourceSha256:digest}).strict()).length(5).refine(items=>items.filter(i=>i.kind==='image').length===4&&items.filter(i=>i.kind==='video').length===1,'Map four images and one video.').refine(items=>new Set(items.map(i=>i.assetId)).size===5,'Each original needs a distinct processed asset.');
export const aviationMediaEvidenceSchema=z.array(z.object({kind:z.enum(['image','video']),assetId:asset,sourceSha256:digest,sourceMatches:z.boolean(),revision:z.number().int().positive().nullable(),processedSha256:digest.nullable(),available:z.boolean()}).strict()).length(5);
/** Read-only trusted RPC evidence. Applying a draft must recheck this evidence
 * under locks; this verifier does not grant write or publication authority. */
export function verifyAviationMigrationMedia(input:unknown,evidence:unknown){
 const bindings=aviationMediaBindingsSchema.parse(input),parsed=aviationMediaEvidenceSchema.parse(evidence);
 if(parsed.some((item,i)=>item.kind!==bindings[i].kind||item.assetId!==bindings[i].assetId||item.sourceSha256!==bindings[i].sourceSha256))throw Error('Aviation media evidence does not match the requested originals.');
 if(parsed.some(item=>item.available&&(!item.sourceMatches||!item.revision||!item.processedSha256)))throw Error('Aviation media evidence is contradictory.');
 return {verified:parsed.every(item=>item.available),evidence:parsed,unavailable:parsed.filter(item=>!item.available).map(item=>item.assetId)};
}
