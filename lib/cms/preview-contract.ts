import {z} from 'zod';
export const previewDocumentSchema=z.object({previewId:z.string().uuid(),websiteId:z.string().uuid(),recordId:z.string().uuid(),revisionId:z.string().uuid(),expiresAt:z.string().datetime({offset:true}),type:z.string(),path:z.string().nullable(),locale:z.string(),payload:z.record(z.string(),z.unknown())}).strict();
export type PreviewDocument=z.infer<typeof previewDocumentSchema>;
export function parsePreviewDocument(input:unknown,expectedId:string,now=Date.now()):PreviewDocument{
 const parsed=previewDocumentSchema.parse(input);
 if(parsed.previewId!==expectedId||Date.parse(parsed.expiresAt)<=now)throw Error('Preview is unavailable or expired.');
 return parsed;
}
