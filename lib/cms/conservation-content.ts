import {z} from 'zod';
import {editorialHeadingSchema} from './editorial-heading.ts';
import {image} from './composition-media.ts';
const text=(max:number)=>z.string().min(1).max(max).refine(value=>Boolean(value.trim()),'Enter visible content.');
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const unique=<T extends z.ZodType<{id:string}>>(schema:T,max:number)=>z.array(schema).min(1).max(max).refine(values=>new Set(values.map(value=>value.id)).size===values.length,'Use unique item IDs.');
const source=z.object({label:text(200),href:z.string().max(2048).refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\]/.test(value);}catch{return false;}},'Use an HTTPS source URL without credentials.'),newWindow:z.boolean()}).strict();
/** Editorial contracts for the existing conservation layout; not yet registered for publication. */
export const conservationContentSchema=z.object({
 hero:z.object({eyebrow:text(200),heading:editorialHeadingSchema,copy:text(2000),image,credit:text(500)}).strict(),
 intro:z.object({label:text(200),heading:editorialHeadingSchema,paragraphs:z.array(text(10000)).min(1).max(10)}).strict(),
 impact:z.object({eyebrow:text(200),heading:editorialHeadingSchema,copy:text(4000),source,primaryLabel:text(200),secondaryLabel:text(200),metrics:unique(z.object({id,value:text(80),label:text(1000),tier:z.enum(['primary','secondary'])}).strict(),30).refine(values=>values.some(value=>value.tier==='primary')&&values.some(value=>value.tier==='secondary'),'Include primary and secondary outcomes.')}).strict(),
 fieldRecords:z.object({eyebrow:text(200),heading:editorialHeadingSchema,copy:text(4000),items:unique(z.object({id,place:text(200),title:text(200),copy:text(10000),image}).strict(),50)}).strict(),
 footprint:z.object({eyebrow:text(200),heading:editorialHeadingSchema,regions:unique(z.object({id,title:text(200),copy:text(2000)}).strict(),20),species:z.object({label:text(200),copy:text(4000)}).strict()}).strict(),
}).strict();
export type ConservationContent=z.infer<typeof conservationContentSchema>;

export const conservationSectionKeys={conservationHero:'hero',conservationIntro:'intro',conservationImpact:'impact',conservationRecords:'fieldRecords',conservationFootprint:'footprint'} as const;
export type ConservationSectionKind=keyof typeof conservationSectionKeys;
export const conservationSectionNames={conservationHero:'Conservation hero',conservationIntro:'Conservation position',conservationImpact:'Conservation outcomes',conservationRecords:'Conservation field records',conservationFootprint:'Conservation footprint'} as const;
export const conservationSectionKinds=Object.keys(conservationSectionKeys) as ConservationSectionKind[];
