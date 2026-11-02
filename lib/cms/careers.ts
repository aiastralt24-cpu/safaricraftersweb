import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';

const uuid=z.string().uuid();
const refs=z.array(z.object({recordId:uuid}).strict()).max(30).refine(rows=>new Set(rows.map(r=>r.recordId.toLowerCase())).size===rows.length,'Select each related record once.');
const instant=z.union([z.literal(''),z.iso.datetime({offset:true})]);
const https=z.string().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\]/.test(value);}catch{return false;}},'Use an HTTPS URL without credentials or spaces.');

/** Application routing is explicit. Form eligibility and external-link evidence
 * must be checked on the server before publication or accepting submissions. */
export const careerApplicationSchema=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('none')}).strict(),
 z.object({mode:z.literal('external'),label:z.string().max(200),url:https}).strict(),
 z.object({mode:z.literal('form'),label:z.string().max(200),formId:uuid}).strict(),
]);
export const careerSchema=z.object({
 schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 summary:z.string().max(2000),organization:z.string().max(200),department:z.string().max(200),referenceCode:z.string().max(100),
 employment:z.enum(['unspecified','fullTime','partTime','contract','temporary','internship','volunteer','other']),
 workMode:z.enum(['onSite','hybrid','remote']),remoteRegions:z.array(z.string().trim().min(1).max(200)).max(30).refine(rows=>new Set(rows.map(r=>r.toLowerCase())).size===rows.length,'List each remote-work region once.'),
 status:z.enum(['open','paused','closed']),statusNote:z.string().max(2000),
 postedOn:z.union([z.literal(''),z.iso.date()]),opensAt:instant,closesAt:instant,
 compensation:z.object({currency:z.string().regex(/^[A-Z]{3}$/),minimum:z.number().finite().min(0).max(1e12),maximum:z.number().finite().min(0).max(1e12),unit:z.enum(['hour','day','week','month','year'])}).strict().refine(v=>v.maximum>=v.minimum,'Maximum compensation must be at least the minimum.').optional(),
 application:careerApplicationSchema,image:image.optional(),
 body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Each job content block needs a unique identity.'),
 relationships:z.object({locations:refs,documents:refs,pages:refs}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict().superRefine((v,ctx)=>{
 if(v.opensAt&&v.closesAt&&Date.parse(v.closesAt)<=Date.parse(v.opensAt))ctx.addIssue({code:'custom',path:['closesAt'],message:'Closing time must follow opening time.'});
});
export type CareerDraft=z.infer<typeof careerSchema>;
export function newCareer():CareerDraft{return {schemaVersion:1,title:'New job',slug:'new-job',summary:'',organization:'',department:'',referenceCode:'',employment:'unspecified',workMode:'onSite',remoteRegions:[],status:'open',statusNote:'',postedOn:'',opensAt:'',closesAt:'',application:{mode:'none'},body:[],relationships:{locations:[],documents:[],pages:[]},seo:newPageSeo(),internalNotes:''};}
export const careerPath=(slug:string)=>`/careers/${slug}`;
export const careerSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:careerSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New jobs require a recovery request; updates require the current revision.');

/** Editorial checks only, never publication or application authorization. */
export function careerDraftFindings(input:unknown):ContentFinding[]{
 const parsed=careerSchema.safeParse(input);
 if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'career_field',message:issue.message,severity:'error'}));
 const v=parsed.data,findings:ContentFinding[]=[];
 const require=(field:string,missing:boolean,message:string)=>{if(missing)findings.push({field,code:'career_required',message,severity:'error'});};
 require('summary',!v.summary.trim(),'Describe the role before publication.');
 require('organization',!v.organization.trim(),'Name the hiring organization.');
 require('employment',v.employment==='unspecified','Choose an employment type.');
 require('postedOn',!v.postedOn,'Provide the job posting date.');
 require('relationships.locations',v.workMode!=='remote'&&!v.relationships.locations.length,'Select a workplace location for on-site or hybrid work.');
 require('remoteRegions',v.workMode!=='onSite'&&!v.remoteRegions.length,'Describe eligible remote-work regions, including worldwide if applicable.');
 require('statusNote',v.status!=='open'&&!v.statusNote.trim(),'Explain why applications are paused or closed.');
 if(v.status==='open'){
  require('application',v.application.mode==='none','Choose an application form or external application page.');
  if(v.application.mode!=='none')require('application.label',!v.application.label.trim(),'Provide application button text.');
  if(v.application.mode==='external')require('application.url',!v.application.url,'Provide the HTTPS application page.');
 }
 require('body',!v.body.some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(t=>Boolean(t.trim())):b.kind==='table'?b.rows.some(row=>row.some(t=>Boolean(t.trim()))):false),'Add the responsibilities, requirements and other substantive job information.');
 return [...findings,...pageSeoFindings(v.seo)];
}

/** Presentation state only. Opening is inclusive; closing is exclusive, based
 * on explicit offset instants. Omitted bounds mean no time restriction.
 * Callers must still check publication and current application-target evidence. */
export function careerApplicationState(input:unknown,now:Date):'unavailable'|'scheduled'|'open'|'paused'|'closed'{
 const parsed=careerSchema.safeParse(input),time=now.getTime();
 if(!parsed.success||!Number.isFinite(time))return 'unavailable';
 const v=parsed.data;
 if(v.status==='closed'||v.closesAt&&time>=Date.parse(v.closesAt))return 'closed';
 if(v.status==='paused')return 'paused';
 if(careerDraftFindings(v).some(f=>f.severity==='error'))return 'unavailable';
 if(v.opensAt&&time<Date.parse(v.opensAt))return 'scheduled';
 return 'open';
}
