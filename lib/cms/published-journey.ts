import {z} from 'zod';
import {projectPublishedPage} from './public-page.ts';
import type {PublicPageConfig} from './public-page.ts';
const optionalText=z.string().optional();
const position=z.coerce.number().int().min(1);
const payload=z.object({slug:z.string(),title:z.string(),description:z.string(),intro:z.string(),region:z.string(),duration:z.string(),bestMonths:z.string(),groupSize:optionalText,difficulty:optionalText,price:optionalText,buttonLabel:optionalText,seoTitle:optionalText,seoDescription:optionalText,
 itinerary:z.array(z.object({itemId:z.string(),position,label:z.string(),title:z.string(),copy:z.string(),stay:optionalText}).strict()).optional(),
 faqs:z.array(z.object({itemId:z.string(),position,question:z.string(),answer:z.string()}).strict()).optional(),
 media:z.array(z.object({itemId:z.string(),position,role:z.enum(['hero','mobileHero','gallery']),assetId:z.string(),alt:z.string(),caption:optionalText,credit:optionalText}).strict()).optional(),
}).strict();
export type PublishedJourney=z.infer<typeof payload>;
export function publishedMediaUrl(assetId:string){if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(assetId))throw Error('Invalid image identifier.');return `/api/cms/published/media/${assetId}`;}
export function parsePublishedJourney(value:unknown,slug:string){
 const page=projectPublishedPage(value,`/journeys/${slug}`);
 if(!page||page.type!=='journey')throw Error('Published journey is unavailable.');
 const journey=payload.parse(page.payload);
 return {...journey,itinerary:[...(journey.itinerary??[])].sort((a,b)=>a.position-b.position),faqs:[...(journey.faqs??[])].sort((a,b)=>a.position-b.position),media:[...(journey.media??[])].sort((a,b)=>a.position-b.position)};
}
export async function readPublishedJourney(slug:string,config:PublicPageConfig|null){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;
 if(!config)throw Error('Published journey delivery is not configured.');
 const value=await config.read(config.site,`/journeys/${slug}`,'en');
 return value===null?null:parsePublishedJourney(value,slug);
}
