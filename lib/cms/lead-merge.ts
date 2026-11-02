import {z} from 'zod';
const uuid=z.string().uuid(),version=z.number().int().positive();
export const leadMergeRequest=z.object({action:z.literal('merge'),site:uuid,source:uuid,target:uuid,sourceVersion:version,targetVersion:version,requestId:uuid}).strict().refine(v=>v.source!==v.target);
export type LeadMergeRequest=z.infer<typeof leadMergeRequest>;
const detail=z.object({id:uuid,version,canEdit:z.literal(true),answers:z.record(z.string(),z.unknown()),consents:z.array(z.unknown()),status:z.string(),priority:z.string(),assignedTo:uuid.nullable(),nextFollowUp:z.string().nullable(),outcome:z.string(),externalCrmReference:z.string().nullable()}).passthrough();
const form=z.object({title:z.string().nullable().optional(),fields:z.record(z.string(),z.string())}).passthrough().nullable();
const reviewSchema=z.object({websiteId:uuid,sourceId:uuid,targetId:uuid,sourceVersion:version,targetVersion:version,policy:z.literal('retain_target_preserve_submissions'),source:detail,target:detail,sourceForm:form,targetForm:form}).strict();
export type LeadMergeReview=z.infer<typeof reviewSchema>;
export function verifiedLeadMergeReview(input:unknown,site:string,source:string,target:string){const value=reviewSchema.parse(input);if(source===target||value.websiteId!==site||value.sourceId!==source||value.targetId!==target||value.source.id!==source||value.target.id!==target||value.source.version!==value.sourceVersion||value.target.version!==value.targetVersion)throw Error('Enquiry merge review mismatch.');return value;}
export function verifiedLeadMergeReceipt(input:unknown,request:LeadMergeRequest){const value=z.object({websiteId:uuid,sourceId:uuid,targetId:uuid,requestId:uuid,replayed:z.boolean()}).strict().parse(input);if(value.websiteId!==request.site||value.sourceId!==request.source||value.targetId!==request.target||value.requestId!==request.requestId)throw Error('Enquiry merge receipt mismatch.');return value;}
