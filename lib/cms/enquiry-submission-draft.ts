import {z} from 'zod';
import {careerEnquirySelectionSchema} from './career-enquiry-context.ts';
import {expeditionEnquirySelectionSchema} from './expedition-enquiry-context.ts';
const uuid=z.string().uuid();
const scopeSchema=z.object({site:uuid,form:uuid,revision:uuid,path:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//'))}).strict();
const pendingSchema=z.object({requestKey:uuid,answers:z.record(z.string().max(128),z.unknown()),sourcePath:z.string().max(500).optional(),career:careerEnquirySelectionSchema.optional(),expedition:expeditionEnquirySelectionSchema.optional()}).strict();
const draftSchema=z.object({requestKey:uuid,pending:pendingSchema.nullable()}).strict().refine(v=>!v.pending||v.pending.requestKey===v.requestKey);
export type EnquirySubmissionDraft=z.infer<typeof draftSchema>;
export type EnquiryDraftScope=z.infer<typeof scopeSchema>;
export function enquirySubmissionDraftKey(scope:EnquiryDraftScope){const v=scopeSchema.parse(scope);return `cms-enquiry-draft:${v.site}:${v.form}:${v.revision}:${v.path}`;}
function parse(text:string){if(text.length>350000)throw Error('Submission recovery is too large.');return draftSchema.parse(JSON.parse(text));}
export function loadEnquirySubmissionDraft(storage:Pick<Storage,'getItem'|'setItem'>,scope:EnquiryDraftScope):EnquirySubmissionDraft{
 const key=enquirySubmissionDraftKey(scope),text=storage.getItem(key);if(text!==null)return parse(text);
 const draft={requestKey:crypto.randomUUID(),pending:null};saveEnquirySubmissionDraft(storage,scope,draft);return draft;
}
export function saveEnquirySubmissionDraft(storage:Pick<Storage,'getItem'|'setItem'>,scope:EnquiryDraftScope,input:EnquirySubmissionDraft){
 const next=draftSchema.parse(input),key=enquirySubmissionDraftKey(scope),text=JSON.stringify(next);parse(text);
 const previous=storage.getItem(key);if(previous!==null){const old=parse(previous);if(old.requestKey!==next.requestKey||old.pending&&JSON.stringify(old.pending)!==JSON.stringify(next.pending))throw Error('A submission is still awaiting confirmation.');}
 storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('Submission recovery could not be saved.');return next;
}
/** Clear only after the caller validates the receipt (or a definitive initial
 * validation rejection). Compare identity so an older response cannot clear a newer draft. */
export function clearEnquirySubmissionDraft(storage:Pick<Storage,'getItem'|'removeItem'>,scope:EnquiryDraftScope,requestKey:string){
 const key=enquirySubmissionDraftKey(scope),text=storage.getItem(key);if(text===null)return;
 if(parse(text).requestKey!==uuid.parse(requestKey))throw Error('Submission recovery changed.');
 storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Submission recovery could not be cleared.');
}
