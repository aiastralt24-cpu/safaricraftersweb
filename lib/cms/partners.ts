import {z} from 'zod';
import {locationSchema} from './locations.ts';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
const refs=z.array(z.object({recordId:uuid}).strict()).max(30).refine(rows=>new Set(rows.map(row=>row.recordId.toLowerCase())).size===rows.length,'Select each related record once.');
const labels=z.array(z.string().trim().min(1).max(200)).max(30).refine(rows=>new Set(rows.map(row=>row.toLowerCase())).size===rows.length,'Use distinct service names.');
/** Partner businesses are reusable records; premises remain separate location records.
 * Referenced certifications never imply approval of claims in this draft. */
export const partnerSchema=z.object({
 schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 kind:z.enum(['dealer','servicePartner','both']),summary:z.string().max(2000),status:z.enum(['active','inactive']),statusNote:z.string().max(2000),
 contact:locationSchema.shape.contact,services:labels,
 coverage:z.array(z.object({countryCode:z.string().regex(/^[A-Z]{2}$/),regions:z.array(z.string().trim().min(1).max(200)).max(30).refine(rows=>new Set(rows.map(row=>row.toLowerCase())).size===rows.length,'List each region once.')}).strict()).max(100).refine(rows=>new Set(rows.map(row=>row.countryCode)).size===rows.length,'List each country once. Combine its regions.'),
 image:image.optional(),body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length,'Each content block needs a unique identity.'),
 relationships:z.object({locations:refs,applications:refs,products:refs,documents:refs,certifications:refs}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type PartnerDraft=z.infer<typeof partnerSchema>;
export function newPartner():PartnerDraft{return {schemaVersion:1,title:'New partner',slug:'new-partner',kind:'servicePartner',summary:'',status:'active',statusNote:'',contact:{email:'',phone:'',website:''},services:[],coverage:[],body:[],relationships:{locations:[],applications:[],products:[],documents:[],certifications:[]},seo:newPageSeo(),internalNotes:''};}
export const partnerPath=(slug:string)=>`/partners/${slug}`;
export const partnerSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:partnerSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New partners require a recovery request; updates require the current revision.');
export function partnerDraftFindings(input:unknown):ContentFinding[]{
 const parsed=partnerSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'partner_field',message:issue.message,severity:'error'}));
 const value=parsed.data,findings:ContentFinding[]=[];
 const require=(field:string,missing:boolean,message:string)=>{if(missing)findings.push({field,code:'partner_required',message,severity:'error'});};
 require('summary',!value.summary.trim(),'Describe this partner before publication.');
 require('services',!value.services.length,'List the services or dealer activities offered.');
 require('coverage',!value.coverage.length,'Specify the countries and regions served.');
 require('contact',!value.contact.email&&!value.contact.phone&&!value.contact.website,'Provide a public contact method.');
 require('status',value.status!=='active','Inactive partners cannot be published.');
 return [...findings,...pageSeoFindings(value.seo)];
}
