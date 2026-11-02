import {z} from 'zod';
import {image,imageFocalPoint} from './composition-media.ts';
import {editorialHeadingSchema} from './editorial-heading.ts';
const text=(max:number)=>z.string().min(1).max(max).refine(value=>Boolean(value.trim()),'Enter visible text.');
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const localHref=z.string().max(2048).refine(value=>/^\/(?!\/)/.test(value)&&!/[\s\\\x00-\x1f]/.test(value),'Use a local website path, preserving planning query parameters.');
const link=z.object({label:text(200),href:localHref}).strict();
const heading={eyebrow:text(200),heading:editorialHeadingSchema};
const unique=<T extends {id:string}>(items:T[])=>new Set(items.map(item=>item.id)).size===items.length;
const list=<T extends z.ZodType<{id:string}>>(schema:T,max:number)=>z.array(schema).min(1).max(max).refine(unique,'Use unique item IDs.');
export const kenyaHeroSchema=z.object({title:text(200),accent:z.string().max(200),copy:text(4000),meta:text(200),image,focalPoint:imageFocalPoint,
  breadcrumbs:list(z.object({id,label:text(100),href:localHref.optional()}).strict(),10)}).strict().superRefine((value,ctx)=>{
 if(value.accent&&!value.title.includes(value.accent))ctx.addIssue({code:'custom',path:['accent'],message:'The emphasized text must appear in the title.'});
 const crumbs=value.breadcrumbs;
 if(crumbs.at(-1)?.href!==undefined||crumbs.slice(0,-1).some(item=>!item.href))ctx.addIssue({code:'custom',path:['breadcrumbs'],message:'Link each ancestor breadcrumb and leave the current page unlinked.'});
});
export const kenyaCountryGroups={hero:kenyaHeroSchema,
 facts:z.object({accessibleLabel:text(200),items:list(z.object({id,label:text(200),value:text(1000),note:text(2000)}).strict(),6)}).strict(),
 introduction:z.object({...heading,lead:text(4000),paragraphs:list(z.object({id,text:text(10000)}).strict(),20)}).strict(),
 places:z.object({...heading,items:list(z.object({id,title:text(200),subtitle:text(500),copy:text(10000),focus:text(1000),image,button:link,imageLinkLabel:text(200)}).strict(),20)}).strict(),
 gallery:z.object({heading:editorialHeadingSchema,copy:text(4000),accessibleLabel:text(200),images:list(z.object({id,image}).strict(),30)}).strict(),
 luxury:z.object({...heading,image,caption:text(2000),paragraphs:list(z.object({id,text:text(10000),emphasized:z.boolean()}).strict(),20)}).strict(),
 itineraries:z.object({...heading,items:list(z.object({id,title:text(200),label:text(200),copy:text(4000),image,button:link}).strict(),12)}).strict(),
 faq:z.object({...heading,items:list(z.object({id,question:text(500),answer:text(10000)}).strict(),40)}).strict(),
 planner:z.object({...heading,copy:text(4000),button:link}).strict(),
 related:z.object({...heading,items:list(z.object({id,title:text(200),copy:text(4000),button:link}).strict(),12)}).strict(),
} as const;
export const kenyaSectionSchemas={kenyaHero:kenyaCountryGroups.hero,kenyaFacts:kenyaCountryGroups.facts,kenyaIntroduction:kenyaCountryGroups.introduction,kenyaPlaces:kenyaCountryGroups.places,kenyaGallery:kenyaCountryGroups.gallery,kenyaLuxury:kenyaCountryGroups.luxury,kenyaItineraries:kenyaCountryGroups.itineraries,kenyaFaq:kenyaCountryGroups.faq,kenyaPlanner:kenyaCountryGroups.planner,kenyaRelated:kenyaCountryGroups.related} as const;
export type KenyaSectionKind=keyof typeof kenyaSectionSchemas;
export const kenyaSectionKinds=Object.keys(kenyaSectionSchemas) as KenyaSectionKind[];
export const kenyaSectionNames={kenyaHero:'Kenya hero',kenyaFacts:'Kenya facts',kenyaIntroduction:'Kenya introduction',kenyaPlaces:'Kenya places',kenyaGallery:'Kenya gallery',kenyaLuxury:'Kenya luxury',kenyaItineraries:'Kenya itineraries',kenyaFaq:'Kenya FAQ',kenyaPlanner:'Kenya planner',kenyaRelated:'Kenya related'} as const;
