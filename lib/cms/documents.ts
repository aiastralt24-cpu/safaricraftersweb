import {z} from 'zod';
import {documentValidationStatusSchema} from './document-validation-status.ts';
import type {DocumentValidationStatus} from './document-validation-status.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
const uuid=z.string().uuid(),short=z.string().trim().max(200);
export const documentDateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
 const time=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
},'Use a real calendar date.');
const references=z.array(z.object({recordId:uuid}).strict()).max(100).refine(items=>new Set(items.map(item=>item.recordId)).size===items.length,'Choose each related record once.');
/** Record identity, owner, approval and immutable revision history belong to the
 * CMS record, never to editable document payload fields. Files remain private
 * until the document-specific processing and delivery path authorizes them. */
export const documentSchema=z.object({
 schemaVersion:z.literal(1),title:short.min(1),description:z.string().max(10000),
 documentType:z.enum(['brochure','catalogue','technicalDataSheet','safetyDocument','certificate','manual','resource']),
 language:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
 regions:z.array(short.min(1)).max(50).refine(items=>new Set(items.map(item=>item.toLowerCase())).size===items.length,'Choose each region once.'),
 versionLabel:short.min(1).max(80),effectiveOn:documentDateSchema.optional(),expiresOn:documentDateSchema.optional(),reviewOn:documentDateSchema.optional(),
 expiryPolicy:z.enum(['warn','blockPublication','removeAvailability']),
 downloadLabel:z.string().trim().min(1).max(100),access:z.enum(['public','authenticated']),
 file:z.object({assetId:uuid,downloadName:z.string().trim().min(5).max(200).refine(value=>/\.pdf$/i.test(value)&&!/[\\/\u0000-\u001f\u007f]/.test(value)&&!value.startsWith('.'),'Use a PDF download filename without paths or control characters.')}).strict().optional(),
 products:references,categories:references,
}).strict().superRefine((value,context)=>{
 if(value.effectiveOn&&value.expiresOn&&value.expiresOn<value.effectiveOn)context.addIssue({code:'custom',path:['expiresOn'],message:'Expiry must be on or after the effective date.'});
 if(value.effectiveOn&&value.reviewOn&&value.reviewOn<value.effectiveOn)context.addIssue({code:'custom',path:['reviewOn'],message:'Review must be on or after the effective date.'});
});
export type DocumentDraft=z.infer<typeof documentSchema>;
export function newDocument(language='en'):DocumentDraft{return documentSchema.parse({schemaVersion:1,title:'New document',description:'',documentType:'brochure',language,regions:[],versionLabel:'1.0',expiryPolicy:'blockPublication',downloadLabel:'Download',access:'public',products:[],categories:[]});}
/** Calendar dates are inclusive UTC days. These flags express only date policy,
 * never file verification, publication, permission or download authorization. */
export function documentDateState(input:unknown,now=new Date()){
 const value=documentSchema.parse(input);if(!Number.isFinite(now.getTime()))throw Error('A valid document evaluation time is required.');
 const today=now.toISOString().slice(0,10),notYetEffective=Boolean(value.effectiveOn&&value.effectiveOn>today),expired=Boolean(value.expiresOn&&value.expiresOn<today),reviewOverdue=Boolean(value.reviewOn&&value.reviewOn<today);
 return {notYetEffective,expired,reviewOverdue,dateAllowsPublication:!notYetEffective&&(!expired||value.expiryPolicy==='warn'),dateAllowsDelivery:!notYetEffective&&(!expired||value.expiryPolicy!=='removeAvailability')};
}
export function validateDocumentDraft(record:ValidationRecord,now=new Date(),status?:DocumentValidationStatus){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=documentSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'document_field',issue.message);
 else{
  const value=parsed.data;
  if(record.path!==null||record.type!=='document'||(record.locale??'en')!==value.language)error('language','document_identity','Document language must match its CMS record; documents use stable download references rather than page URLs.');
  if(!value.file)error('file','document_file_required','Choose a verified PDF before publication.');
  const evidence=documentValidationStatusSchema.safeParse(status);
  if(!evidence.success)error('file','document_evidence_missing','Current document file and relationship checks are unavailable. Run validation again.');
  else{
   const file=evidence.data.file;
   if(value.file){
    if(!file||file.assetId.toLowerCase()!==value.file.assetId.toLowerCase())error('file','document_file_mismatch','The file checks do not match this saved document. Run validation again.');
    else{
     if(!file.processed||file.revision===null)error('file','document_file_unprocessed','The selected PDF has not completed verified processing.');
     if(!file.rightsApproved)error('file','document_rights_unapproved','Approve this PDF’s usage rights before publication.');
     if(!file.rightsCurrent)error('file','document_rights_expired','This PDF’s usage rights have expired.');
     if(file.archived)error('file','document_file_archived','Restore the archived PDF or choose another file.');
    }
   }else if(file)error('file','document_file_mismatch','Unexpected file evidence was returned. Run validation again.');
   const products=evidence.data.products,ids=products.map(item=>item.recordId.toLowerCase());
   if(new Set(ids).size!==ids.length||products.length!==value.products.length||products.some(item=>!value.products.some(ref=>ref.recordId.toLowerCase()===item.recordId.toLowerCase())))error('products','document_product_evidence','Product checks do not match this saved document. Run validation again.');
   else for(const [index,reference]of value.products.entries()){
    const product=products.find(item=>item.recordId.toLowerCase()===reference.recordId.toLowerCase());
    if(!product?.available||product.locale!==value.language)error(`products.${index}`,'document_product_unavailable','Choose an existing product from this website in the document language.');
   }
  }
  if(value.categories.length)error('categories','document_categories_not_ready','Category relationships require the category module before this document can be published. The saved selections are retained.');
  const dates=documentDateState(value,now);
  if(dates.notYetEffective)error('effectiveOn','document_not_effective','This document is not effective yet.');
  if(dates.expired)findings.push({field:'expiresOn',severity:dates.dateAllowsPublication?'warning':'error',code:'document_expired',message:value.expiryPolicy==='warn'?'This document has expired. Its configured policy warns without withdrawing it.':'This document has expired and its configured policy blocks publication.'});
  if(dates.reviewOverdue)findings.push({field:'reviewOn',severity:'warning',code:'document_review_overdue',message:'This document is overdue for review.'});
 }
 return {validatorVersion:'document-1',contentChecksPass:!findings.some(finding=>finding.severity==='error'),findings};
}
