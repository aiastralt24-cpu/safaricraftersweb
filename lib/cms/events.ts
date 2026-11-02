import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {safeHref} from './composition.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';

const short=z.string().max(200),date=z.union([z.literal(''),z.iso.date()]);
const instant=z.union([z.literal(''),z.iso.datetime({offset:true})]);
/** Timed values always carry an offset. All-day end dates are inclusive civil
 * dates and must never be converted through the browser's local time zone. */
export const eventTimingSchema=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('timed'),start:instant,end:instant}).strict(),
 z.object({mode:z.literal('allDay'),start:date,end:date}).strict(),
]).superRefine((v,ctx)=>{
 if(!v.start||!v.end)return;
 const invalid=v.mode==='timed'?Date.parse(v.end)<=Date.parse(v.start):v.end<v.start;
 if(invalid)ctx.addIssue({code:'custom',path:['end'],message:v.mode==='timed'?'End must be after the start instant.':'The inclusive end date cannot precede the start date.'});
});
const refs=z.array(z.object({recordId:z.string().uuid()}).strict()).max(30).refine(rows=>new Set(rows.map(r=>r.recordId)).size===rows.length,'Select each related record once.');
const optionalHref=z.union([z.literal(''),safeHref]);
export const eventSchema=z.object({
 schemaVersion:z.literal(1),title:short.trim().min(1),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 summary:z.string().max(2000),category:z.string().max(120),organizer:short,
 status:z.enum(['scheduled','postponed','rescheduled','cancelled']),statusNote:z.string().max(2000),
 timing:eventTimingSchema,
 attendance:z.enum(['inPerson','online','hybrid']),
 venue:z.object({name:short,address:z.string().max(1000),city:short,region:short,country:short}).strict(),
 onlineUrl:optionalHref,registration:z.object({enabled:z.boolean(),label:short,href:optionalHref}).strict(),
 image:image.optional(),heroImage:image.optional(),gallery:z.array(image).max(30),
 body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Each event block needs a unique identity.'),
 relationships:z.object({pages:refs,projects:refs,articles:refs,destinations:refs,documents:refs}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type EventDraft=z.infer<typeof eventSchema>;
export function newEvent():EventDraft{return {
 schemaVersion:1,title:'New event',slug:'new-event',summary:'',category:'',organizer:'',status:'scheduled',statusNote:'',
 timing:{mode:'timed',start:'',end:''},attendance:'inPerson',venue:{name:'',address:'',city:'',region:'',country:''},onlineUrl:'',
 registration:{enabled:false,label:'Register',href:''},gallery:[],body:[],relationships:{pages:[],projects:[],articles:[],destinations:[],documents:[]},seo:newPageSeo(),internalNotes:'',
};}
export const eventPath=(slug:string)=>`/events/${slug}`;
const uuid=z.string().uuid();
export const eventSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:eventSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New events require a recovery request; updates require the current revision.');

/** Editorial findings only. Never use this as publication authorization: current
 * server evidence, approval, locale/route and reference checks remain required. */
export function eventDraftFindings(input:unknown):ContentFinding[]{
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=eventSchema.safeParse(input);
 if(!parsed.success){for(const issue of parsed.error.issues)error(issue.path.join('.'),'event_field',issue.message);return findings;}
 const v=parsed.data;
 for(const field of ['summary','organizer','category'] as const)if(!v[field].trim())error(field,'event_required','Complete this field before publication.');
 if(!v.timing.start)error('timing.start','event_start_required','Provide the event start.');
 if(!v.timing.end)error('timing.end','event_end_required','Provide the event end.');
 if(v.status!=='scheduled'&&!v.statusNote.trim())error('statusNote','event_status_note_required','Explain the cancellation, postponement or rescheduling.');
 if(v.attendance!=='online')for(const field of ['name','address','city','country'] as const)if(!v.venue[field].trim())error(`venue.${field}`,'event_venue_required','Complete the physical venue.');
 if(v.attendance!=='inPerson'&&!v.onlineUrl.startsWith('https://'))error('onlineUrl','event_online_url_required','Provide an HTTPS event access or information URL.');
 if(v.registration.enabled){
  if(!v.registration.label.trim()||!v.registration.href)error('registration','event_registration_required','Provide registration link text and a destination.');
  if(['cancelled','postponed'].includes(v.status))error('registration.enabled','event_registration_closed','Disable registration while the event is cancelled or postponed.');
 }
 if(!v.body.some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(t=>Boolean(t.trim())):b.kind==='table'?b.rows.some(row=>row.some(t=>Boolean(t.trim()))):false))error('body','event_body_required','Add substantive event information.');
 return [...findings,...pageSeoFindings(v.seo)];
}
