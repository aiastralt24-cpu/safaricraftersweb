import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {projectClaimSchema} from './projects.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';
const short=z.string().max(200);
const refs=z.array(z.object({recordId:z.string().uuid()}).strict()).max(30).refine(rows=>new Set(rows.map(r=>r.recordId.toLowerCase())).size===rows.length,'Select each related record once.');
/** Reusable application or industry content, independent of travel destinations. */
export const applicationSchema=z.object({
 schemaVersion:z.literal(1),kind:z.enum(['application','industry']),title:short.trim().min(1),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 summary:z.string().max(2000),image:image.optional(),
 body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Each content block needs a unique identity.'),
 relationships:z.object({applications:refs,products:refs,projects:refs,articles:refs,documents:refs}).strict(),
 claims:z.array(projectClaimSchema).max(30).refine(rows=>new Set(rows.map(row=>row.id.toLowerCase())).size===rows.length,'Each claim needs a unique identity.'),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type ApplicationDraft=z.infer<typeof applicationSchema>;
export function newApplication(kind:ApplicationDraft['kind']='application'):ApplicationDraft{return {schemaVersion:1,kind,title:kind==='industry'?'New industry':'New application',slug:kind==='industry'?'new-industry':'new-application',summary:'',body:[],relationships:{applications:[],products:[],projects:[],articles:[],documents:[]},claims:[],seo:newPageSeo(),internalNotes:''};}
export const applicationPath=(slug:string,kind:ApplicationDraft['kind'])=>`/${kind==='industry'?'industries':'applications'}/${slug}`;
const uuid=z.string().uuid();
export const applicationSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:applicationSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New records require a recovery request; updates require the current revision.');
export function applicationDraftFindings(input:unknown):ContentFinding[]{
 const parsed=applicationSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'application_field',message:issue.message,severity:'error'}));
 const value=parsed.data,findings:ContentFinding[]=[];
 if(!value.summary.trim())findings.push({field:'summary',code:'application_required',message:'Add a summary before publication.',severity:'error'});
 if(!value.body.some(block=>block.kind==='paragraph'&&block.text.trim()))findings.push({field:'body',code:'application_body',message:'Add an explanatory paragraph before publication.',severity:'error'});
 value.claims.forEach((claim,index)=>{for(const [field,missing,message]of [['statement',!claim.statement.trim(),'Describe the claim.'],['evidence',!claim.evidence.length,'Attach supporting documents.'],['approvalContact',!claim.approvalContact.trim(),'Name the intended approval contact.'],['reviewOn',!claim.reviewOn,'Set a claim review date.']] as const)if(missing)findings.push({field:`claims.${index}.${field}`,code:'application_claim',message,severity:'error'});});
 return [...findings,...pageSeoFindings(value.seo)];
}
