import {z} from 'zod';
import {certificationSchema,certificationPath,certificationDraftFindings} from './certifications.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const certificationEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,claimApproved:z.boolean(),references:z.array(z.object({type:z.enum(['location','page']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(60),media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(1)}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateCertificationContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=certificationSchema.safeParse(input.payload),checked=certificationEvidenceSchema.safeParse(evidence);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'certification_field',issue.message);
 if(input.type!=='certification')error('type','certification_identity','Certification checks require a certification record.');
 if(input.locale!=='en')error('locale','certification_locale_not_ready','Certification delivery for this language is not connected yet.');
 const bound=checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision;
 if(!bound)error('evidence','certification_evidence_missing','Current server evidence for this saved revision is unavailable.');
 if(parsed.success){const value=parsed.data;
  findings.push(...certificationDraftFindings(value));
  if(input.path!==certificationPath(value.slug))error('slug','certification_identity','The saved URL must match the certification slug.');
  if(bound&&checked.success){const e=checked.data;
   if(!e.claimApproved)error('statement','certification_approval_required','The assigned reviewer must approve current evidence for this active, valid certification before its review deadline.');
   const refs=([['locations','location'],['pages','page']] as const).flatMap(([key,type])=>value.relationships[key].map(r=>({...r,type,key})));
   if(e.references.length!==refs.length||e.references.some(r=>!refs.some(x=>x.type===r.type&&x.recordId===r.recordId)))error('relationships','certification_evidence_mismatch','Related-record evidence does not match this draft.');
   for(const ref of refs){const rows=e.references.filter(r=>r.type===ref.type&&r.recordId===ref.recordId);if(rows.length!==1||!rows[0].available||!rows[0].published||rows[0].locale!==input.locale||ref.recordId===input.record)error(`relationships.${ref.key}`,'certification_reference_unavailable','Choose a published related record in this website and language.');}
   const assets=value.seo.socialImage?[value.seo.socialImage.assetId]:[];
   if(e.media.length!==assets.length||e.media.some(m=>!assets.includes(m.assetId)))error('media','certification_evidence_mismatch','Image evidence does not match this draft.');
   for(const asset of assets){const rows=e.media.filter(m=>m.assetId===asset);if(rows.length!==1||!rows[0].available)error('seo.socialImage','certification_image_unavailable','The sharing image needs verified processing and current approved rights.');}
  }
 }
 return {validatorVersion:'certification-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
