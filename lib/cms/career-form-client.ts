import {z} from 'zod';
import {careerEnquirySelectionSchema} from './career-enquiry-context.ts';
import {parseExpectedPublicForm} from './public-form.ts';
export const careerFormOptionsSchema=careerEnquirySelectionSchema.extend({formRevisionId:z.string().uuid()});
export type CareerFormOptions=z.infer<typeof careerFormOptionsSchema>;
export function careerFormUrl(formId:string,input:CareerFormOptions){
 const c=careerFormOptionsSchema.parse(input);z.string().uuid().parse(formId);
 return `/api/cms/careers/${c.recordId}/application?${new URLSearchParams({revision:c.revisionId,form:formId,formRevision:c.formRevisionId})}`;
}
export function parseCareerFormResponse(input:unknown,formId:string,options:CareerFormOptions){
 const expected=careerFormOptionsSchema.parse(options),response=z.object({form:z.unknown(),career:careerEnquirySelectionSchema}).strict().parse(input);
 if(response.career.recordId!==expected.recordId||response.career.revisionId!==expected.revisionId||response.career.slug!==expected.slug)throw Error('The job changed. Reload before applying.');
 return parseExpectedPublicForm(response.form,formId,{revisionId:expected.formRevisionId,locale:'en'});
}
export function careerSubmissionSelection(options:CareerFormOptions,path:string){
 const c=careerFormOptionsSchema.parse(options);if(path!==`/careers/${c.slug}`)throw Error('The application does not match this job page.');
 return {recordId:c.recordId,revisionId:c.revisionId,slug:c.slug};
}
