import {checkEnquiryUploadStatus,parseEnquiryUploadTracker,type EnquiryUploadScope,type EnquiryUploadTracker} from './enquiry-file-client.ts';
import type {FormField,VerifiedFormFile} from './forms.ts';
/** Client convenience only. The server independently checks ownership and scans.
 * A replacement still being checked must never silently select an older file. */
export function selectEnquiryAttachments(scope:EnquiryUploadScope,tracker:EnquiryUploadTracker,status:unknown,fields:FormField[]){
 const t=parseEnquiryUploadTracker(JSON.stringify(tracker),scope),checked=checkEnquiryUploadStatus(status,t);
 if(checked.session.state!=='active'||Date.parse(checked.session.expiresAt)<=Date.now())throw Error('This upload session is no longer active.');
 const answers:Record<string,string>={},files:VerifiedFormFile[]=[];
 for(const field of fields){
  if(field.type!=='file')continue;
  const selected=t.files.filter(file=>file.field===field.id).at(-1);if(!selected)continue;
  const evidence=checked.files.find(file=>file.uploadId===selected.id);
  if(!evidence||evidence.state!=='ready')throw Error('Wait for the selected files to finish security checks.');
  if(!field.mimeTypes.includes(evidence.mime)||evidence.bytes>field.maxBytes)throw Error('The selected file does not match this field.');
  answers[field.id]=selected.id;files.push({uploadId:selected.id,mimeType:evidence.mime,byteSize:evidence.bytes,available:true});
 }
 return {answers,files,headers:enquiryAttachmentHeaders(scope,t)};
}

export function enquiryAttachmentHeaders(scope:EnquiryUploadScope,tracker:EnquiryUploadTracker){
 const t=parseEnquiryUploadTracker(JSON.stringify(tracker),scope);
 return {Authorization:`Bearer ${t.secret}`,'x-cms-form':t.form,'x-cms-revision':t.revision,'x-cms-request':t.request,'x-cms-session':t.session};
}
