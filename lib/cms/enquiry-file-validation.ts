import {formSchema,validateFormSubmission,type VerifiedFormFile} from './forms.ts';
export type BoundEnquiryFile=VerifiedFormFile & {fieldId:string};
/** Server intake boundary: generic/client form validation cannot establish file
 * ownership. Only evidence bound to this exact submitted field is usable here. */
export function validateEnquirySubmission(definition:unknown,input:unknown,files:BoundEnquiryFile[]=[]){
 const answers=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
 const parsed=formSchema.safeParse(definition),fileIds=new Set(parsed.success?parsed.data.fields.filter(field=>field.type==='file').map(field=>field.id):[]);
 const bound=files.filter(file=>{
  if(typeof file.fieldId!=='string'||!fileIds.has(file.fieldId)||files.filter(other=>other.uploadId===file.uploadId).length!==1)return false;
  const matches=Object.entries(answers).filter(([key,value])=>fileIds.has(key)&&typeof value==='string'&&value.trim()===file.uploadId);return matches.length===1&&matches[0][0]===file.fieldId;
 });
 return validateFormSubmission(definition,input,bound);
}
