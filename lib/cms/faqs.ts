import {z} from 'zod';
import {richText} from './composition.ts';
const references=z.array(z.object({recordId:z.string().uuid()}).strict()).max(30).refine(rows=>new Set(rows.map(row=>row.recordId)).size===rows.length,'Select each related record once.');
export const faqSchema=z.object({schemaVersion:z.literal(1),question:z.string().trim().min(1).max(200),answer:richText,topic:z.string().max(120),keywords:z.array(z.string().trim().min(1).max(80)).max(20).refine(words=>new Set(words.map(word=>word.toLowerCase())).size===words.length,'Use distinct keywords.'),reviewOn:z.union([z.literal(''),z.iso.date()]),relationships:z.object({pages:references,products:references,destinations:references,documents:references}).strict(),internalNotes:z.string().max(2000)}).strict();
export type FaqDraft=z.infer<typeof faqSchema>;
export function newFaq():FaqDraft{return {schemaVersion:1,question:'New question',answer:[],topic:'',keywords:[],reviewOn:'',relationships:{pages:[],products:[],destinations:[],documents:[]},internalNotes:''};}
export function faqDraftFindings(input:unknown){const parsed=faqSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),message:issue.message}));const findings:{field:string;message:string}[]=[];if(!parsed.data.answer.length)findings.push({field:'answer',message:'Add an answer before submitting this FAQ.'});return findings;}
const uuid=z.string().uuid();
export const faqSaveCommand=z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:faqSchema}).strict().refine(value=>value.record===null?value.expectedRevision===null&&Boolean(value.requestKey):value.expectedRevision!==null&&value.requestKey===undefined,'New FAQs need a recovery request ID; updates need the current revision.');
export type FaqSaveCommand=z.infer<typeof faqSaveCommand>;
