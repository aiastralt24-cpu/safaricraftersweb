import {z} from 'zod';
import {photoExpeditionSchema} from './photo-expeditions.ts';
/** Preview dates are explicit UTC calendar dates, never inferred from free-text labels. */
export function projectPhotoExpeditionPreview(input:unknown,today:string){
 const date=z.iso.date().parse(today),content=photoExpeditionSchema.parse(input);
 const departures=[...content.departures].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 return {content,today:date,upcoming:departures.filter(item=>item.date>=date),earlier:departures.filter(item=>item.date<date)};
}
