import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';

const uuid=z.string().uuid();
const refs=z.array(z.object({recordId:uuid}).strict()).max(30).refine(rows=>new Set(rows.map(row=>row.recordId.toLowerCase())).size===rows.length,'Select each related record once.');
const time=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const interval=z.object({opens:time,closes:z.union([time,z.literal('24:00')])}).strict().refine(row=>row.opens<row.closes,'Closing time must follow opening time. Split overnight hours across two days.');
const day=z.object({day:z.number().int().min(1).max(7),intervals:z.array(interval).max(4)}).strict().superRefine((row,ctx)=>{
 const ordered=[...row.intervals].sort((a,b)=>a.opens.localeCompare(b.opens));
 for(let i=1;i<ordered.length;i++)if(ordered[i].opens<ordered[i-1].closes)ctx.addIssue({code:'custom',path:['intervals'],message:'Opening intervals must not overlap.'});
});
const timezone=z.string().max(100).refine(value=>{if(!value)return true;try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Use a valid time zone.');
const website=z.string().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\]/.test(value);}catch{return false;}},'Use an HTTPS website URL without credentials or spaces.');

/** Business premises, separate from travel destinations. Empty details are allowed in drafts. */
export const locationSchema=z.object({
 schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 kind:z.enum(['office','showroom','serviceCentre','warehouse','other']),summary:z.string().max(2000),
 address:z.object({lines:z.array(z.string().trim().min(1).max(200)).max(4),locality:z.string().max(200),region:z.string().max(200),postalCode:z.string().max(40),countryCode:z.string().regex(/^(?:[A-Z]{2})?$/)}).strict(),
 coordinates:z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180)}).strict().optional(),
 contact:z.object({email:z.union([z.literal(''),z.string().email().max(254)]),phone:z.string().max(60).refine(value=>!value||/^[+\d][\d () .-]*(?:ext\.? ?\d+)?$/.test(value),'Use a telephone number, optionally with an extension.'),website}).strict(),
 timeZone:timezone,hours:z.array(day).max(7).refine(rows=>new Set(rows.map(row=>row.day)).size===rows.length,'List each weekday once.'),
 visiting:z.enum(['unspecified','walkIn','appointmentOnly','noPublicAccess']),accessibilityNotes:z.string().max(2000),
 image:image.optional(),body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length,'Each content block needs a unique identity.'),
 relationships:z.object({applications:refs,products:refs,projects:refs,articles:refs,documents:refs}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type LocationDraft=z.infer<typeof locationSchema>;
export function newLocation():LocationDraft{return {schemaVersion:1,title:'New location',slug:'new-location',kind:'office',summary:'',address:{lines:[],locality:'',region:'',postalCode:'',countryCode:''},contact:{email:'',phone:'',website:''},timeZone:'',hours:[],visiting:'unspecified',accessibilityNotes:'',body:[],relationships:{applications:[],products:[],projects:[],articles:[],documents:[]},seo:newPageSeo(),internalNotes:''};}
export const locationPath=(slug:string)=>`/locations/${slug}`;
export const locationSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:locationSchema}).strict().refine(value=>value.record===null?value.expectedRevision===null&&Boolean(value.requestKey):value.expectedRevision!==null&&value.requestKey===undefined,'New records require a recovery request; updates require the current revision.');
export function locationDraftFindings(input:unknown):ContentFinding[]{
 const parsed=locationSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'location_field',message:issue.message,severity:'error'}));
 const value=parsed.data,findings:ContentFinding[]=[];
 const require=(field:string,missing:boolean,message:string)=>{if(missing)findings.push({field,code:'location_required',message,severity:'error'});};
 require('summary',!value.summary.trim(),'Add a location summary before publication.');
 require('address.lines',!value.address.lines.length,'Add a street or premises address.');
 require('address.locality',!value.address.locality.trim(),'Add the locality.');
 require('address.countryCode',!value.address.countryCode,'Add the two-letter country code.');
 require('visiting',value.visiting==='unspecified','Explain whether visitors can attend.');
 require('timeZone',Boolean(value.hours.length&&!value.timeZone),'Set a time zone for opening hours.');
 require('contact',value.visiting==='appointmentOnly'&&!value.contact.email&&!value.contact.phone&&!value.contact.website,'Provide a contact method for appointments.');
 return [...findings,...pageSeoFindings(value.seo)];
}
