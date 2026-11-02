import {z} from 'zod';
export const settingsReferenceStatusSchema=z.array(z.object({recordId:z.string().uuid(),available:z.boolean(),type:z.enum(['navigation','journey','destination','journalArticle']).optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).optional()}).strict()).max(15);
export type SettingsReferenceStatus=z.infer<typeof settingsReferenceStatusSchema>[number];
