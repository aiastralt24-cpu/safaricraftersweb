import {z} from 'zod';
const asset=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),digest=z.string().regex(/^[a-f0-9]{64}$/);
export const miceMediaBindingsSchema=z.array(z.object({assetId:asset,sourceSha256:digest}).strict()).length(2).refine(items=>new Set(items.map(i=>i.assetId)).size===2,'Map each original to a distinct processed image.');
export const miceMediaEvidenceSchema=z.array(z.object({assetId:asset,sourceSha256:digest,sourceMatches:z.boolean(),revision:z.number().int().positive().nullable(),processedSha256:digest.nullable(),available:z.boolean()}).strict()).length(2);
/** The established contact-image evidence RPC applies the same image-1 source,
 * processing, site, rights, expiry and archive policy to these two originals.
 * The apply transaction rechecks and locks this evidence. */
export function verifyMiceMigrationMedia(requested:unknown,evidence:unknown){
 const bindings=miceMediaBindingsSchema.parse(requested),observed=miceMediaEvidenceSchema.parse(evidence);
 if(observed.some((item,i)=>item.assetId!==bindings[i].assetId||item.sourceSha256!==bindings[i].sourceSha256))throw Error('MICE media evidence does not match the requested originals.');
 if(observed.some(item=>item.available&&(!item.sourceMatches||!item.revision||!item.processedSha256)))throw Error('MICE media evidence is contradictory.');
 return {verified:observed.every(item=>item.available),evidence:observed,unavailable:observed.filter(item=>!item.available).map(item=>item.assetId)};
}
