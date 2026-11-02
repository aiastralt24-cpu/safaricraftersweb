import {z} from 'zod';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image,heroFraming} from './composition-media.ts';
const text=(max:number)=>z.string().min(1).max(max).refine(value=>Boolean(value.trim()),'Enter visible content.');
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const unique=<T extends {id:string}>(items:T[])=>new Set(items.map(item=>item.id)).size===items.length;
// Preserve supported planning intent while rejecting normalization tricks. More
// destinations may be admitted by an explicit publication policy, not coercion.
export const guidedLinkSchema=z.object({label:text(30),href:z.string().max(2048).refine(value=>{
 if(value==='/plan?guided=true')return true;
 if(/^#[a-z][a-z0-9-]*$/.test(value))return true;
 if(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/.test(value))return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\\x00-\x1f]/.test(value);}catch{return false;}
},'Use a local path, section anchor, approved guided planning link or HTTPS URL.'),newWindow:z.boolean().default(false)}).strict();
const framedImage=z.object({image,mobileImage:image.optional(),desktopFraming:heroFraming,mobileFraming:heroFraming}).strict();
const paragraphs=z.array(z.object({id,text:text(10000)}).strict()).min(1).max(30).refine(unique,'Paragraph IDs must be unique.');
const titled={eyebrow:text(200),heading:editorialHeadingSchema};
const card=z.object({id,eyebrow:text(200),heading:editorialHeadingSchema,copy:text(4000),media:framedImage}).strict();
/** Editable source-preserving content contracts. These do not authorize publication,
 * approve media or replace the live route; registry/editor integration follows. */
export const guidedSectionSchemas={
 guidedHero:z.object({...titled,copy:text(4000),media:framedImage,button:guidedLinkSchema,scrollCue:z.object({label:text(200),accessibleLabel:text(300),anchor:z.string().regex(/^#[a-z][a-z0-9-]*$/)}).strict()}).strict(),
 guidedIntroduction:z.object({...titled,paragraphs}).strict(),
 guidedEncounter:z.object({accessibleLabel:text(300),media:framedImage,expandOnScroll:z.boolean()}).strict(),
 guidedFieldCards:z.object({...titled,introduction:text(4000),items:z.array(card).min(1).max(12).refine(unique,'Card IDs must be unique.'),mobileLayout:z.enum(['horizontal','stacked'])}).strict(),
 guidedPhotography:z.object({...titled,paragraphs,quotation:text(4000),media:framedImage}).strict(),
 guidedCompanion:z.object({...titled,paragraphs,media:framedImage,button:z.object({enabled:z.boolean(),link:guidedLinkSchema}).strict().optional()}).strict(),
 guidedPaths:z.object({...titled,items:z.array(card.extend({action:guidedLinkSchema})).min(1).max(12).refine(unique,'Card IDs must be unique.')}).strict(),
 guidedFaq:z.object({...titled,items:z.array(z.object({id,question:text(500),answer:text(10000)}).strict()).min(1).max(50).refine(unique,'FAQ IDs must be unique.'),initialOpenId:id.nullable()}).strict().refine(value=>value.initialOpenId===null||value.items.some(item=>item.id===value.initialOpenId),{path:['initialOpenId'],message:'Choose an existing FAQ or start with all answers closed.'}),
} as const;
export const guidedSectionKinds=Object.keys(guidedSectionSchemas) as (keyof typeof guidedSectionSchemas)[];
export type GuidedSectionKind=keyof typeof guidedSectionSchemas;
