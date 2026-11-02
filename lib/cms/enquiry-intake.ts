import {careerSourceMatches} from './career-source-context.ts';
import {z} from 'zod';
import {careerEnquirySelectionSchema,type CareerEnquirySelection} from './career-enquiry-context.ts';
import {expeditionEnquirySelectionSchema,type ExpeditionEnquirySelection} from './expedition-enquiry-context.ts';
import {formSchema} from './forms.ts';
import {validateEnquirySubmission,type BoundEnquiryFile} from './enquiry-file-validation.ts';
const uuid=z.string().uuid();
const submission=z.object({career:careerEnquirySelectionSchema.optional(),expedition:expeditionEnquirySelectionSchema.optional(),formId:uuid,revisionId:uuid,requestKey:uuid,answers:z.record(z.string().max(128),z.unknown()).refine(v=>Object.keys(v).length<=50),sourcePath:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//')).optional(),challengeToken:z.string().max(4096),website:z.literal('').default('')}).strict().refine(v=>!v.career||!v.expedition,'Choose one enquiry context.');
const stored=z.object({websiteId:uuid,formId:uuid,revisionId:uuid,definition:formSchema}).strict();
export type EnquiryIntakeAdapter={
 /** Server-established identity only: never a digest supplied in the body. */
 consumeRate():Promise<{allowed:boolean;retryAfter:number}>;
 verifyChallenge(token:string):Promise<boolean>;
 read(formId:string,revisionId:string,requestKey:string):Promise<unknown>;
 /** Authorize each upload against this submission session before returning evidence. */
 files(formId:string,revisionId:string,answers:Record<string,unknown>,context:{request:string;definition:unknown}):Promise<BoundEnquiryFile[]>;
 persist(input:{site:string;form:string;revision:string;request:string;answers:Record<string,string|string[]|boolean>;consents:unknown[];attribution:{sourcePath?:string};expedition?:ExpeditionEnquirySelection;career?:CareerEnquirySelection}):Promise<unknown>;
};
/** Pure service orchestration. The HTTP adapter must bound bytes, establish the
 * configured site and network identity, and enforce its origin policy. */
export async function acceptFormEnquiry(raw:unknown,site:string,adapter:EnquiryIntakeAdapter){
 const fail=(status:number,error:string,extra:Record<string,unknown>={})=>({status,body:{ok:false,error,...extra}});
 if(!uuid.safeParse(site).success)return fail(503,'Enquiries are temporarily unavailable.');
 const parsed=submission.safeParse(raw);if(!parsed.success)return fail(422,'Check the enquiry fields.');const c=parsed.data;if(!careerSourceMatches(c.sourcePath,c.career))return fail(422,'Reload the job page before submitting your application.');
 try{
  const rate=await adapter.consumeRate();if(!rate.allowed)return fail(429,'Please wait before trying again.',{retryAfter:Math.max(1,Math.min(600,Math.ceil(rate.retryAfter)||600))});
  if(!await adapter.verifyChallenge(c.challengeToken))return fail(422,'Please complete the submission check and try again.');
  const current=stored.safeParse(await adapter.read(c.formId,c.revisionId,c.requestKey));
  if(!current.success||current.data.websiteId!==site||current.data.formId!==c.formId||current.data.revisionId!==c.revisionId)return fail(409,'This form has changed or is unavailable. Reload it before submitting.');
  const definition=current.data.definition;
  const files=definition.fields.some(field=>field.type==='file')?await adapter.files(c.formId,c.revisionId,c.answers,{request:c.requestKey,definition}):[];
  const checked=validateEnquirySubmission(definition,c.answers,files);
  if(!checked.valid)return fail(422,'Review the highlighted fields.',{fields:checked.issues});
  const receipt=z.object({leadId:uuid,receivedAt:z.string().datetime({offset:true}),replayed:z.boolean()}).strict().safeParse(await adapter.persist({site,form:c.formId,revision:c.revisionId,request:c.requestKey,answers:checked.values,consents:checked.consents,attribution:c.sourcePath?{sourcePath:c.sourcePath}:{},...(c.expedition?{expedition:c.expedition}:{}),...(c.career?{career:c.career}:{})}));
  if(!receipt.success)return fail(503,'We could not confirm your enquiry was saved. Retry with the same request key.');
  return {status:200,body:{ok:true,reference:receipt.data.leadId,receivedAt:receipt.data.receivedAt,message:definition.successMessage,...(definition.successHeading!==undefined?{heading:definition.successHeading}:{}),redirectPath:definition.redirectPath??null}};
 }catch{return fail(503,'We could not confirm your enquiry was saved. Retry with the same request key.');}
}
