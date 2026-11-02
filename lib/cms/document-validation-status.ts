import {z} from 'zod';
export const documentValidationStatusSchema=z.object({
 file:z.object({assetId:z.string().max(200),revision:z.number().int().min(1).nullable(),processed:z.boolean(),rightsApproved:z.boolean(),rightsCurrent:z.boolean(),archived:z.boolean()}).strict().nullable(),
 products:z.array(z.object({recordId:z.string().max(200),available:z.boolean(),locale:z.string().nullable()}).strict()).max(100),
}).strict();
export type DocumentValidationStatus=z.infer<typeof documentValidationStatusSchema>;
