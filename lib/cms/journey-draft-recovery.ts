import {z} from 'zod';
import {readJourneyItems} from './journey-collections.ts';
/** Retain unseen JSON fields; collection and URL identity must remain usable. */
export function parseJourneyRecoveryDraft(input:unknown,path:string):Record<string,unknown>&{title:string;slug:string}{
 const value=z.record(z.string(),z.json()).parse(input);
 const title=z.string().trim().min(1).max(200).parse(value.title);
 const slug=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(value.slug);
 if(path!==`/journeys/${slug}`)throw Error('Recovered journey URL does not match this record.');
 for(const kind of ['itinerary','faqs','media'] as const)readJourneyItems(value[kind]);
 return {...value,title,slug};
}
