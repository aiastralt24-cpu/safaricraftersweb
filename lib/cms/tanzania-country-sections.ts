import {z} from 'zod';
import {kenyaCountryGroups} from './kenya-country-sections.ts';
import {image} from './composition-media.ts';
import {editorialHeadingSchema} from './editorial-heading.ts';
const text=(max:number)=>z.string().trim().min(1).max(max),id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const heading={eyebrow:text(200),heading:editorialHeadingSchema};
const planner=z.object({label:text(200),interest:text(500),region:text(100),dialogLabel:text(600),dialogEyebrow:text(200),closeLabel:text(100)}).strict();
const list=<T extends z.ZodType<{id:string}>>(item:T,max:number)=>z.array(item).min(1).max(max).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length,'Use unique item IDs.');
/** Reuses shared country contracts but retains Tanzania's captions and planner actions. */
export const tanzaniaCountryGroups={
 hero:kenyaCountryGroups.hero,facts:kenyaCountryGroups.facts,introduction:kenyaCountryGroups.introduction,
 places:z.object({...heading,items:list(z.object({id,title:text(200),subtitle:text(500),copy:text(10000),image,imageCaption:z.string().max(2000),planner}).strict(),20)}).strict(),
 gallery:kenyaCountryGroups.gallery,
 itineraries:z.object({...heading,items:list(z.object({id,title:text(200),label:text(200),copy:text(4000),image,planner}).strict(),12)}).strict(),
 faq:kenyaCountryGroups.faq,planner:z.object({...heading,copy:text(4000),planner}).strict(),related:kenyaCountryGroups.related,
} as const;
export const tanzaniaSectionSchemas={tanzaniaHero:tanzaniaCountryGroups.hero,tanzaniaFacts:tanzaniaCountryGroups.facts,tanzaniaIntroduction:tanzaniaCountryGroups.introduction,tanzaniaPlaces:tanzaniaCountryGroups.places,tanzaniaGallery:tanzaniaCountryGroups.gallery,tanzaniaItineraries:tanzaniaCountryGroups.itineraries,tanzaniaFaq:tanzaniaCountryGroups.faq,tanzaniaPlanner:tanzaniaCountryGroups.planner,tanzaniaRelated:tanzaniaCountryGroups.related} as const;
export type TanzaniaSectionKind=keyof typeof tanzaniaSectionSchemas;
export const tanzaniaSectionKinds=Object.keys(tanzaniaSectionSchemas) as TanzaniaSectionKind[];
export const tanzaniaSectionNames={tanzaniaHero:'Tanzania hero',tanzaniaFacts:'Tanzania facts',tanzaniaIntroduction:'Tanzania introduction',tanzaniaPlaces:'Tanzania places',tanzaniaGallery:'Tanzania gallery',tanzaniaItineraries:'Tanzania itineraries',tanzaniaFaq:'Tanzania FAQ',tanzaniaPlanner:'Tanzania planner',tanzaniaRelated:'Tanzania related'} as const;
