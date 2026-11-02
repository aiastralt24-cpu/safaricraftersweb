import {z} from 'zod';
import {careerEnquirySelectionSchema} from './career-enquiry-context.ts';
const uuid=z.string().uuid();
const snapshot=z.object({recordId:uuid,revisionId:uuid,path:z.string().max(109).regex(/^\/careers\/[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(1).max(200),organization:z.string().min(1).max(200),referenceCode:z.string().max(100),formId:uuid,formRevisionId:uuid,acceptedAt:z.iso.datetime({offset:true})}).strict();
/** Display immutable acceptance evidence, never current job content or inferred form purpose. */
export function readLeadCareerContext(attribution:unknown,binding:{formId:unknown;formRevision:unknown}):{status:'none'}|{status:'invalid'}|{status:'ready';context:z.infer<typeof snapshot>}{
 if(!attribution||typeof attribution!=='object'||Array.isArray(attribution))return {status:'none'};
 const value=attribution as Record<string,unknown>;
 if(!Object.hasOwn(value,'career')&&!Object.hasOwn(value,'careerSelection'))return {status:'none'};
 const context=snapshot.safeParse(value.career),selection=careerEnquirySelectionSchema.safeParse(value.careerSelection);
 if(!context.success||!selection.success||Object.hasOwn(value,'expedition')||Object.hasOwn(value,'expeditionSelection'))return {status:'invalid'};
 const c=context.data,s=selection.data;
 if(c.recordId!==s.recordId||c.revisionId!==s.revisionId||c.path!==`/careers/${s.slug}`||c.path!==value.sourcePath||c.formId!==binding.formId||c.formRevisionId!==binding.formRevision)return {status:'invalid'};
 return {status:'ready',context:c};
}
