import {z} from 'zod';
import {publishedExpeditionCardSchema} from './public-expedition-directory.ts';
const filterSchema=z.object({geography:z.enum(['all','India','International']),month:z.union([z.literal('all'),z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)])}).strict();
/** Dates are UTC calendar strings; never parse free-text labels into availability. */
export function projectExpeditionDirectory(input:unknown,today:string,filters:unknown={geography:'all',month:'all'}){
 const cards=z.array(publishedExpeditionCardSchema).max(1000).parse(input),date=z.iso.date().parse(today),filter=filterSchema.parse(filters);
 const ids=new Set<string>(),paths=new Set<string>();
 for(const card of cards){if(ids.has(card.recordId)||paths.has(card.path)||card.path!==`/photo-expeditions/${card.content.slug}`||!card.content.image)throw Error('Invalid expedition directory identity.');ids.add(card.recordId);paths.add(card.path);}
 const upcoming=cards.flatMap(card=>card.content.departures.filter(d=>d.date>=date).map(departure=>({card,departure}))).sort((a,b)=>a.departure.date.localeCompare(b.departure.date)||a.card.recordId.localeCompare(b.card.recordId)||a.departure.id.localeCompare(b.departure.id));
 const months=[...new Set(upcoming.map(item=>item.departure.date.slice(0,7)))];
 const matches=(card:typeof cards[number])=>filter.geography==='all'||card.content.geography===filter.geography;
 const departures=upcoming.filter(item=>matches(item.card)&&(filter.month==='all'||item.departure.date.startsWith(filter.month)));
 const matchingIds=new Set(departures.map(item=>item.card.recordId));
 return {cards:cards.filter(card=>matches(card)&&(filter.month==='all'||matchingIds.has(card.recordId))).sort((a,b)=>a.content.title.localeCompare(b.content.title,'en')||a.recordId.localeCompare(b.recordId)),departures,months,today:date};
}
