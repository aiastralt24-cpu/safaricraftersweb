import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {safeHref} from './composition.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';
const short=z.string().max(200),refs=z.array(z.object({recordId:z.string().uuid()}).strict()).max(30).refine(rows=>new Set(rows.map(r=>r.recordId)).size===rows.length,'Select each related record once.');
/** Reusable leadership identity, separate from trip-planning specialists. */
export const leadershipSchema=z.object({
 schemaVersion:z.literal(1),title:short.trim().min(1),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 role:short,department:z.string().max(120),status:z.enum(['current','former']),sortOrder:z.number().int().min(0).max(9999),
 summary:z.string().max(2000),image:image.optional(),
 body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Each biography block needs a unique identity.'),
 links:z.array(z.object({label:short.trim().min(1),href:safeHref}).strict()).max(10),
 relationships:z.object({pages:refs,projects:refs,articles:refs,documents:refs}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type LeadershipDraft=z.infer<typeof leadershipSchema>;
export function newLeadership():LeadershipDraft{return {schemaVersion:1,title:'New leadership profile',slug:'new-leadership-profile',role:'',department:'',status:'current',sortOrder:0,summary:'',body:[],links:[],relationships:{pages:[],projects:[],articles:[],documents:[]},seo:newPageSeo(),internalNotes:''};}
export const leadershipPath=(slug:string)=>`/leadership/${slug}`;
const uuid=z.string().uuid();
export const leadershipSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:leadershipSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New profiles require a recovery request; updates require the current revision.');
/** Editorial guidance only; does not establish media rights or publication approval. */
export function leadershipDraftFindings(input:unknown):ContentFinding[]{
 const parsed=leadershipSchema.safeParse(input);
 if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'leadership_field',message:issue.message,severity:'error'}));
 const v=parsed.data,findings:ContentFinding[]=[];
 for(const field of ['role','summary'] as const)if(!v[field].trim())findings.push({field,code:'leadership_required',message:'Complete this field before publication.',severity:'error'});
 if(!v.body.some(b=>b.kind==='paragraph'&&b.text.trim()))findings.push({field:'body',code:'leadership_biography',message:'Add a biography paragraph before publication.',severity:'error'});
 return [...findings,...pageSeoFindings(v.seo)];
}
