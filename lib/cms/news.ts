import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
const references=z.array(z.object({recordId:z.string().uuid()}).strict()).max(30).refine(rows=>new Set(rows.map(r=>r.recordId)).size===rows.length,'Select each related record once.');
/** News has its own identity; it never changes the shape of existing journal drafts. */
export const newsSchema=z.object({
 schemaVersion:z.literal(1),kind:z.enum(['news','pressRelease']),
 title:z.string().trim().min(1).max(200),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 summary:z.string().max(2000),author:z.string().max(200),date:z.union([z.literal(''),z.iso.date()]),
 topic:z.string().max(120),dateline:z.string().max(200),
 image:image.optional(),heroImage:image.optional(),gallery:z.array(image).max(30),
 body:z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Each news block needs a unique identity.'),
 relationships:z.object({pages:references,projects:references,articles:references,destinations:references,documents:references}).strict(),
 seo:pageSeoSchema,internalNotes:z.string().max(2000),
}).strict();
export type NewsDraft=z.infer<typeof newsSchema>;
export function newNews(kind:NewsDraft['kind']='news'):NewsDraft{return {schemaVersion:1,kind,title:kind==='news'?'New news item':'New press release',slug:kind==='news'?'new-news':'new-press-release',summary:'',author:'',date:'',topic:'',dateline:'',gallery:[],body:[],relationships:{pages:[],projects:[],articles:[],destinations:[],documents:[]},seo:newPageSeo(),internalNotes:''};}
export function newsPath(slug:string){return `/news/${slug}`;}
const uuid=z.string().uuid();
export const newsSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:newsSchema}).strict().refine(v=>v.record===null?v.expectedRevision===null&&Boolean(v.requestKey):v.expectedRevision!==null&&v.requestKey===undefined,'New records require a recovery request; updates require the current revision.');
