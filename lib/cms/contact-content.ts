import {z} from 'zod';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image,imageFocalPoint} from './composition-media.ts';
const text=(max:number)=>z.string().min(1).max(max).refine(value=>Boolean(value.trim()),'Enter visible content.');
// These links stay within the website. Reject URL normalization tricks before
// parsing; encoded separators and dot segments must not escape the local route.
const localHref=z.string().max(500).regex(/^\/[a-z0-9/-]*(?:#[a-zA-Z0-9_-]+)?$/).refine(value=>!value.includes('//'),'Use a local page path and optional anchor.');
const linkedCopy=z.object({copy:text(2000),link:z.object({label:text(200),href:localHref}).strict()}).strict();
/** Contact editorial data only. Publication additionally needs an authorized,
 * compatible published form revision and verified media; this schema grants neither. */
export const contactContentSchema=z.object({
 intro:z.object({
  eyebrow:text(200),heading:editorialHeadingSchema,lead:text(4000),scope:text(2000),image,
  focalPoint:imageFocalPoint,showImageOnMobile:z.boolean(),
  direct:z.object({prompt:text(300),label:text(300),email:z.string().email().max(254).refine(value=>!/[\s?&#%]/.test(value),'Use a plain email address without query parameters.')}).strict(),
  corporate:linkedCopy,
 }).strict(),
 enquiry:z.object({eyebrow:text(200),heading:editorialHeadingSchema,copy:text(4000),requiredHint:text(1000),privacy:linkedCopy,form:z.object({recordId:z.string().uuid()}).strict().optional()}).strict(),
}).strict();
export type ContactContent=z.infer<typeof contactContentSchema>;

export const contactSectionKeys={contactIntro:'intro',contactEnquiry:'enquiry'} as const;
export type ContactSectionKind=keyof typeof contactSectionKeys;
export const contactSectionKinds=Object.keys(contactSectionKeys) as ContactSectionKind[];
export const contactSectionNames={contactIntro:'Contact introduction',contactEnquiry:'Contact enquiry introduction'} as const;
