import {z} from 'zod';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image,imageFocalPoint} from './composition-media.ts';
const text=(max:number)=>z.string().trim().min(1).max(max);
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const unique=<T extends {id:string}>(items:T[])=>new Set(items.map(item=>item.id)).size===items.length;
const localHref=z.string().max(500).regex(/^(?:\/[a-z0-9/-]*(?:#[a-z][a-z0-9-]*)?|#[a-z][a-z0-9-]*)$/).refine(value=>!value.includes('//'),'Use a local path or section anchor.');
const link=z.object({label:text(100),href:localHref}).strict();
const titles={eyebrow:text(200),heading:editorialHeadingSchema};
const paragraphs=z.array(z.object({id,text:text(10000)}).strict()).min(1).max(30).refine(unique,'Paragraph IDs must be unique.');
const items=z.array(z.object({id,title:text(200),copy:text(4000)}).strict()).min(1).max(20).refine(unique,'Item IDs must be unique.');
/** Editorial contracts only. Form compatibility, media rights, trusted validation
 * and public delivery must be verified separately before publication. */
export const miceSectionSchemas={
 miceHero:z.object({...titles,copy:text(4000),image,focalPoint:imageFocalPoint,breadcrumbs:z.array(z.object({id,label:text(100),href:localHref.optional()}).strict()).min(1).max(10).refine(unique,'Breadcrumb IDs must be unique.')}).strict(),
 miceIntroduction:z.object({...titles,paragraphs,button:link}).strict(),
 miceFormats:z.object({accessibleLabel:text(200),items}).strict(),
 miceDestinations:z.object({...titles,copy:text(4000),items:z.array(z.object({id,title:text(200),copy:text(4000),image,focalPoint:imageFocalPoint,button:link}).strict()).min(1).max(20).refine(unique,'Destination IDs must be unique.')}).strict(),
 miceProcess:z.object({...titles,items}).strict(),
 miceEnquiry:z.object({...titles,copy:text(4000),formNote:z.string().max(1000).optional(),form:z.object({recordId:z.string().uuid()}).strict().optional()}).strict(),
} as const;
export type MiceSectionKind=keyof typeof miceSectionSchemas;
export const miceSectionKinds=Object.keys(miceSectionSchemas) as MiceSectionKind[];
export const miceSectionNames={miceHero:'MICE hero',miceIntroduction:'Corporate introduction',miceFormats:'Corporate travel formats',miceDestinations:'Corporate destinations',miceProcess:'Planning process',miceEnquiry:'Corporate enquiry'} as const;
