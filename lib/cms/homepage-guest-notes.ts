import {z} from 'zod';
import {sectionDataSchemas} from './composition.ts';
import {testimonialSchema,testimonialDisplay} from './testimonials.ts';
export type HomepageGuestNotes=z.infer<typeof sectionDataSchemas.homepageGuestNotes>;
const base={id:z.string().uuid(),type:z.literal('testimonial'),payload:testimonialSchema};
function display(record:z.infer<typeof testimonialSchema>,selection:HomepageGuestNotes['items'][number],revisionId:string){
 const safe=testimonialDisplay(record);
 return {recordId:selection.recordId,revisionId,name:safe.name,quote:safe.quote,trip:safe.trip,category:safe.guestType,image:selection.image,href:selection.href};
}
export function projectHomepageGuestDraft(input:unknown,selection:HomepageGuestNotes['items'][number]){
 selection=sectionDataSchemas.homepageGuestNotes.shape.items.element.parse(selection);
 const record=z.object({...base,currentRevision:z.string().uuid()}).passthrough().parse(input);
 if(record.id!==selection.recordId)throw Error('Guest note identity mismatch.');
 return {card:display(record.payload,selection,record.currentRevision),consent:record.payload.consent.status,verified:record.payload.verified};
}
/** Server-side trusted published record projection. Never expose consent evidence,
 * withheld identity or the guest portrait in the public carousel payload. */
export function projectPublishedHomepageGuest(input:unknown,selection:HomepageGuestNotes['items'][number]){
 selection=sectionDataSchemas.homepageGuestNotes.shape.items.element.parse(selection);
 const record=z.object({...base,revisionId:z.string().uuid()}).strict().parse(input);
 if(record.id!==selection.recordId||!record.payload.verified||record.payload.consent.status!=='granted')throw Error('The selected guest note is not eligible for publication.');
 return display(record.payload,selection,record.revisionId);
}
export type HomepageGuestCard=ReturnType<typeof projectPublishedHomepageGuest>;

/** Public RPC contract. No private testimonial fields cross the provider boundary. */
export const publicHomepageGuestSchema=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),name:z.string().min(1).max(200),quote:z.string().trim().min(1).max(10000),trip:z.string().max(200),category:z.string().max(200)}).strict();
export function resolvePublicHomepageGuest(input:unknown,selection:HomepageGuestNotes['items'][number]):HomepageGuestCard{
 const record=publicHomepageGuestSchema.parse(input),chosen=sectionDataSchemas.homepageGuestNotes.shape.items.element.parse(selection);
 if(record.recordId!==chosen.recordId)throw Error('Published guest identity mismatch.');
 return {...record,image:chosen.image,href:chosen.href};
}
