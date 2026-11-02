import {z} from 'zod';
import {formSchema} from './forms.ts';
import {validateFormPublication} from './form-publication.ts';
import type {ContentFinding} from './content-validation.ts';
import type {projectMicePage} from './mice-page.ts';
const uuid=z.string().uuid();
const published=z.object({websiteId:uuid,formId:uuid,revisionId:uuid,locale:z.literal('en'),definition:formSchema}).strict();
const requiredFields=[['name','name',true],['email','email',true],['phone','phone',true],['company','organization',false],['destination','select',false],['message','message',false],['consent','consent',true]] as const;
/** Preserve the corporate intake's stable field identities. Copy is editable;
 * renamed/hidden identity fields require an explicit mapping migration. */
export function validateMiceFormCompatibility(definition:unknown){
 const parsed=formSchema.safeParse(definition);
 const base=parsed.success?validateFormPublication({type:'form',path:null,locale:'en',payload:parsed.data}):{findings:parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'form_field',message:issue.message,severity:'error' as const}))},findings:ContentFinding[]=[...base.findings];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 if(parsed.success){
  for(const [id,type,required]of requiredFields){
   const field=parsed.data.fields.find(f=>f.id===id);
   if(!field||field.type!==type||field.required!==required||field.showWhen)error(`fields.${id}`,'mice_form_field',`Corporate enquiries require an always-visible ${type} field named ${id}, ${required?'required':'optional'}. Review the intake mapping before changing it.`);
  }
  const destination=parsed.data.fields.find(f=>f.id==='destination');
  if(destination?.type==='select'&&!destination.defaultOptionId)error('fields.destination','mice_destination_default','Choose an explicit default destination preference.');
  const consent=parsed.data.fields.find(f=>f.id==='consent');
  if(consent?.type==='consent'&&consent.purpose!=='enquiry')error('fields.consent','mice_enquiry_consent','Corporate enquiry consent must have the enquiry purpose. Marketing consent is separate.');
 }
 return {validatorVersion:'mice-form-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
export type MiceFormBinding={recordId:string;revisionId:string;locale:'en'};
/** Server-side orchestration: callback must read the published-form source with
 * site authority, not an editor draft. Validate every scheduled dependency. */
export async function resolveMiceForms(page:ReturnType<typeof projectMicePage>,site:string,readPublishedForm:(site:string,id:string)=>Promise<unknown>){
 uuid.parse(site);const ids=z.array(uuid).min(1).max(100).parse(page.requiredFormIds);
 const currentSections=page.sections.filter(s=>s.kind==='miceEnquiry');
 const currentId=currentSections.length===1?currentSections[0].data.form?.recordId:undefined;
 if(!currentId||!ids.includes(currentId)||new Set(ids).size!==ids.length)throw Error('MICE form dependencies are inconsistent.');
 const bindings:MiceFormBinding[]=[];
 for(const id of ids){
  const raw=await readPublishedForm(site,id);if(raw===null)throw Error('A required corporate form is not published.');
  const form=published.parse(raw);if(form.websiteId!==site||form.formId!==id)throw Error('Corporate form identity mismatch.');
  const checked=validateMiceFormCompatibility(form.definition);// The guarded published source already establishes notification eligibility.
  if(checked.findings.some(f=>f.severity==='error'&&f.code!=='notification_routes_unverified'))throw Error('Corporate form delivery or field mapping is incompatible.');
  bindings.push({recordId:form.formId,revisionId:form.revisionId,locale:form.locale});
 }
 return {current:bindings.find(b=>b.recordId===currentId)!,bindings};
}
