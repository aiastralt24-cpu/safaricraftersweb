import {z} from 'zod';
import {image} from './composition.ts';
import {photoExpeditionSchema} from './photo-expeditions.ts';
// Display choices must be reviewed against the legacy page, including merged galleries
// and date-dependent FAQs. A source snapshot alone cannot establish those choices.
export const expeditionMigrationDisplaySchema=photoExpeditionSchema.pick({heroTitle:true,heroCopy:true,heroImage:true,mobileHeroImage:true,gallery:true,labels:true,booking:true,enquiry:true}).extend({
 heroImage:image,enquiry:photoExpeditionSchema.shape.enquiry.extend({form:z.object({recordId:z.string().uuid()}).strict()}),
 additionalFaqs:photoExpeditionSchema.shape.faqs,reviewedOn:z.iso.date(),reviewNotes:z.string().trim().min(1).max(10000),
}).strict();
export const expeditionMigrationMappingsSchema=z.record(z.string(),z.object({
 images:z.record(z.string(),image).default({}),programmeStatus:photoExpeditionSchema.shape.programmeStatus,
 specialists:photoExpeditionSchema.shape.specialists,display:expeditionMigrationDisplaySchema,
 departureHomepageNotes:z.record(z.string().regex(/^departures-[1-9]\d*$/),z.object({date:z.iso.date(),text:z.string().trim().min(1).max(200)}).strict()).optional(),
}).strict());
