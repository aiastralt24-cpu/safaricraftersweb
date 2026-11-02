import {z} from 'zod';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const assetId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(value=>!value.startsWith('review-only-'),'Review placeholders are not asset mappings.');
const mediaBinding=z.object({sourcePath:z.string(),sourceSha256:digest,assetId}).strict();
const recordBinding=z.object({sourceKey:z.string(),recordId:z.string().uuid()}).strict();
export const conceptMigrationManifestSchema=z.object({captureDigest:digest,media:z.array(mediaBinding).max(1000),records:z.array(recordBinding).max(1000)}).strict();
export type ConceptMigrationManifest=z.infer<typeof conceptMigrationManifestSchema>;
