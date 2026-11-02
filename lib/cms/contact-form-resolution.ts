import {z} from 'zod';
import {formSchema} from './forms.ts';
import {validateFormPublication} from './form-publication.ts';
import type {PublishedContactPage} from './contact-page.ts';
const uuid=z.string().uuid();
const publishedForm=z.object({websiteId:uuid,formId:uuid,revisionId:uuid,locale:z.literal('en'),definition:formSchema}).strict();
export type ContactFormBinding={recordId:string;revisionId:string;locale:'en'};
/** Server-only orchestration contract. The callback must read get_published_form,
 * never an editor record or visitor-provided definition. Returned bindings contain
 * no notification routes, success copy or complete private form definition. */
export async function resolveContactForms(page:PublishedContactPage,site:string,readPublishedForm:(site:string,formId:string)=>Promise<unknown>){
 uuid.parse(site);
 const ids=z.array(uuid).min(1).max(100).parse(page.requiredFormIds);
 if(new Set(ids).size!==ids.length||!ids.includes(page.formId))throw Error('Contact form dependencies are inconsistent.');
 // Resolve scheduled dependencies too; a future panel must not activate with an
 // unchecked form. Failure is atomic: no partial bindings are returned.
 const bindings:ContactFormBinding[]=[];
 for(const id of ids){
  const raw=await readPublishedForm(site,id);
  if(raw===null)throw Error('A required contact form is not published.');
  const form=publishedForm.parse(raw);
  if(form.websiteId!==site||form.formId!==id)throw Error('Contact form identity mismatch.');
  const checked=validateFormPublication({type:'form',path:null,locale:form.locale,payload:form.definition});
  // The authoritative published reader already rechecks notification delivery.
  // Retain all structural/attachment checks; never use this path for editor drafts.
  if(checked.findings.some(f=>f.severity==='error'&&f.code!=='notification_routes_unverified'))throw Error('Contact form delivery is unsupported.');
  bindings.push({recordId:form.formId,revisionId:form.revisionId,locale:form.locale});
 }
 const current=bindings.find(binding=>binding.recordId===page.formId)!;
 return {current,bindings};
}
