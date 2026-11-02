import {z} from 'zod';
const uuid=z.string().uuid(),revision=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),date=z.string().datetime({offset:true});
export const documentFileSchema=z.object({id:uuid,revision,filename:z.string().min(5).max(200),bytes:z.number().int().min(1).max(25000000),pages:z.number().int().min(1).max(300),parserVersion:z.string().regex(/^\d+\.\d+\.\d+$/),inspectionVersion:z.literal('document-pdf-1'),createdAt:date,rightsStatus:z.enum(['pending','approved','revoked']),rightsExpiresAt:date.nullable(),archivedAt:date.nullable(),rightsEvidence:z.string().max(5000).nullable(),canManageRights:z.boolean(),canArchive:z.boolean().default(false),eligible:z.boolean()}).strict();
export type DocumentFile=z.infer<typeof documentFileSchema>;

export const documentFileUsageSchema=z.object({recordId:uuid,title:z.string(),type:z.string(),path:z.string().nullable(),draft:z.boolean(),published:z.boolean(),historical:z.boolean()}).strict().refine(value=>value.draft||value.published||value.historical);
export type DocumentFileUsage=z.infer<typeof documentFileUsageSchema>;
