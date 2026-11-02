import {z} from 'zod';
import {formSchema} from './forms.ts';
import {careerSchema,careerPath,careerDraftFindings} from './careers.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const careerEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,applicationForm:z.object({websiteId:uuid,formId:uuid,revisionId:uuid,locale:z.string(),definition:z.record(z.string(),z.unknown())}).strict().nullable(),references:z.array(z.object({type:z.enum(['location','document','page','form']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(91),media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(233),links:z.array(z.object({href:z.string(),available:z.boolean()}).strict()).max(10000)}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateCareerContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=careerSchema.safeParse(input.payload),checked=careerEvidenceSchema.safeParse(evidence);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'career_field',issue.message);
 if(input.type!=='career')error('type','career_identity','Career checks require a career record.');
 if(input.locale!=='en')error('locale','career_locale_not_ready','Career delivery for this language is not connected yet.');
 if(!checked.success||checked.data.websiteId!==input.site||checked.data.recordId!==input.record||checked.data.revisionId!==input.revision)error('evidence','career_evidence_missing','Current server evidence for this saved revision is unavailable.');
 if(parsed.success){const v=parsed.data;
  if(input.path!==careerPath(v.slug))error('slug','career_identity','The saved URL must match the career slug.');
  findings.push(...careerDraftFindings(v));
  if(checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision){const e=checked.data;
   if(v.application.mode==='form'){
    const f=e.applicationForm,definition=formSchema.safeParse(f?.definition);
    if(!f||f.websiteId!==input.site||f.formId!==v.application.formId||f.locale!==input.locale||!definition.success||definition.data.fields.some(field=>field.type==='file'))error('application.formId','career_form_unavailable','Select a published form in this website and language with supported fields and delivery. File uploads are not connected yet. Notification readiness is checked by the published form source.');
   }else if(e.applicationForm!==null)error('application','career_evidence_mismatch','Application evidence does not match this draft.');
   const expectedMedia=[...new Set([v.image,v.seo.socialImage,...v.body.flatMap(b=>b.kind==='image'?[b.image]:[])].filter(Boolean).map(i=>i!.assetId))];
   if(e.media.length!==expectedMedia.length||e.media.some(m=>!expectedMedia.includes(m.assetId)))error('media','career_evidence_mismatch','Image evidence does not match this draft.');
   for(const asset of expectedMedia){const rows=e.media.filter(m=>m.assetId===asset);if(rows.length!==1||!rows[0].available)error('media','career_image_unavailable','A selected image needs verified processing and current approved rights.');}
   const refs=([['locations','location'],['documents','document'],['pages','page']] as const).flatMap(([key,type])=>v.relationships[key].map(r=>({...r,type,key:key as string})));
   const expectedRefs:Array<{recordId:string;type:'location'|'document'|'page'|'form';key:string}>=[...refs,...(v.application.mode==='form'?[{recordId:v.application.formId,type:'form' as const,key:'application.formId'}]:[])];
   if(e.references.length!==expectedRefs.length||e.references.some(r=>!expectedRefs.some(x=>x.type===r.type&&x.recordId===r.recordId)))error('relationships','career_evidence_mismatch','Related-record evidence does not match this draft.');
   for(const ref of expectedRefs){const rows=e.references.filter(r=>r.type===ref.type&&r.recordId===ref.recordId);if(rows.length!==1||!rows[0].available||!rows[0].published||rows[0].locale!==input.locale||ref.recordId===input.record)error(ref.type==='form'?'application.formId':`relationships.${ref.key}`,'career_reference_unavailable','Choose a published related record in this website and language.');}
   const hrefs=new Set<string>();const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='href'&&typeof child==='string'&&(child.startsWith('/')||child.startsWith('#')))hrefs.add(child);else walk(child);}};walk(v.body);
   if(e.links.length!==hrefs.size||e.links.some(l=>!hrefs.has(l.href)))error('links','career_evidence_mismatch','Internal-link evidence does not match this draft.');
   for(const href of hrefs){const rows=e.links.filter(l=>l.href===href);if(rows.length!==1||!rows[0].available)error('links','career_link_unavailable','An internal link does not resolve to an available page. Fragment links need a supported anchor before publication.');}
  }
 }
 return {validatorVersion:'career-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
