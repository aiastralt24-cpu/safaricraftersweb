import {z} from 'zod';
export const specialistReferenceStatusSchema=z.array(z.discriminatedUnion('available',[
 z.object({recordId:z.string().uuid(),available:z.literal(false)}).strict(),
 z.object({recordId:z.string().uuid(),available:z.literal(true),type:z.enum(['journey','photoExpedition']),locale:z.string()}).strict(),
])).max(200);
export type SpecialistReferenceStatus=z.infer<typeof specialistReferenceStatusSchema>[number];
