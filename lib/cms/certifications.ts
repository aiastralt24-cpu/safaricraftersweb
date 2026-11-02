import {z} from 'zod';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';

const uuid=z.string().uuid();
const date=z.union([z.literal(''),z.iso.date()]);
const references=z.array(z.object({recordId:uuid}).strict()).max(30).refine(rows=>new Set(rows.map(row=>row.recordId.toLowerCase())).size===rows.length,'Select each record once.');

/** Author content only. Approval and evidence validity must come from scoped,
 * revision-bound server records, never an editable certification payload. */
export const certificationSchema=z.object({
 schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),
 slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 summary:z.string().max(2000),issuer:z.string().max(200),certificateNumber:z.string().max(200),
 statement:z.string().max(2000),scope:z.string().max(2000),
 issuedOn:date,validFrom:date,expiresOn:date,reviewOn:date,
 validity:z.enum(['unspecified','dated','noExpiry']),
 status:z.enum(['active','suspended','revoked']),statusNote:z.string().max(2000),
 evidence:references,relationships:z.object({locations:references,pages:references}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict().superRefine((value,ctx)=>{
 for(const [field,earlier] of [['validFrom','issuedOn'],['expiresOn','validFrom'],['expiresOn','issuedOn']] as const){
  if(value[field]&&value[earlier]&&value[field]<value[earlier])ctx.addIssue({code:'custom',path:[field],message:`${field} must not precede ${earlier}.`});
 }
 if(value.validity==='noExpiry'&&value.expiresOn)ctx.addIssue({code:'custom',path:['expiresOn'],message:'A certificate without expiry cannot also have an expiry date.'});
});
export type CertificationDraft=z.infer<typeof certificationSchema>;
export function newCertification():CertificationDraft{return {
 schemaVersion:1,title:'New certification',slug:'new-certification',summary:'',issuer:'',certificateNumber:'',statement:'',scope:'',
 issuedOn:'',validFrom:'',expiresOn:'',reviewOn:'',validity:'unspecified',status:'active',statusNote:'',
 evidence:[],relationships:{locations:[],pages:[]},seo:newPageSeo(),internalNotes:'',
};}
export const certificationSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:certificationSchema}).strict().refine(value=>value.record===null?value.expectedRevision===null&&Boolean(value.requestKey):value.expectedRevision!==null&&value.requestKey===undefined,'New certifications require a recovery request; updates require the current revision.');

export function certificationDraftFindings(input:unknown):ContentFinding[]{
 const parsed=certificationSchema.safeParse(input);
 if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'certification_field',message:issue.message,severity:'error'}));
 const value=parsed.data,findings:ContentFinding[]=[];
 const required=(field:string,missing:boolean,message:string)=>{if(missing)findings.push({field,code:'certification_required',message,severity:'error'});};
 for(const field of ['summary','issuer','statement','scope','issuedOn','validFrom','reviewOn'] as const)required(field,!value[field].trim(),`Provide ${field} before requesting publication.`);
 required('evidence',!value.evidence.length,'Select supporting certificate documents.');
 required('validity',value.validity==='unspecified','Specify whether the certificate expires.');
 required('expiresOn',value.validity==='dated'&&!value.expiresOn,'Provide the certificate expiry date.');
 required('statusNote',value.status!=='active'&&!value.statusNote.trim(),'Explain the suspension or revocation.');
 return [...findings,...pageSeoFindings(value.seo)];
}

/** Editorial status, NOT publication authorization. Calendar dates use UTC;
 * expiry is inclusive through that date, review becomes due on its date.
 * Current evidence, owner approval and publication must be checked separately. */
export function certificationTemporalState(input:unknown,now:Date):'unavailable'|'revoked'|'suspended'|'scheduled'|'expired'|'reviewDue'|'current'{
 const parsed=certificationSchema.safeParse(input);
 if(!parsed.success||!Number.isFinite(now.getTime()))return 'unavailable';
 const value=parsed.data,today=now.toISOString().slice(0,10);
 if(value.status!=='active')return value.status;
 if(certificationDraftFindings(value).some(finding=>finding.severity==='error'))return 'unavailable';
 if(value.expiresOn&&today>value.expiresOn)return 'expired';
 if(today>=value.reviewOn)return 'reviewDue';
 if(today<value.validFrom)return 'scheduled';
 return 'current';
}

export const certificationPath=(slug:string)=>`/certifications/${slug}`;
