import test from 'node:test';import assert from 'node:assert/strict';
import {loadEnquirySubmissionDraft,saveEnquirySubmissionDraft,clearEnquirySubmissionDraft,enquirySubmissionDraftKey} from '../lib/cms/enquiry-submission-draft.ts';
import {newEnquiryUploadTracker,trackEnquiryUpload} from '../lib/cms/enquiry-file-client.ts';
import {selectEnquiryAttachments,enquiryAttachmentHeaders} from '../lib/cms/enquiry-file-selection.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,scope={site:id(1),form:id(2),revision:id(3),path:'/enquire'};
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('submission draft retains exact pending answers across reload and rejects changed requests',()=>{
 const store=storage(),draft=loadEnquirySubmissionDraft(store,scope);assert.deepEqual(loadEnquirySubmissionDraft(store,scope),draft);
 const saved={...draft,pending:{requestKey:draft.requestKey,answers:{name:'Applicant'},sourcePath:'/enquire'}};saveEnquirySubmissionDraft(store,scope,saved);assert.deepEqual(loadEnquirySubmissionDraft(store,scope),saved);
 assert.throws(()=>saveEnquirySubmissionDraft(store,scope,{...saved,pending:{...saved.pending,answers:{name:'Other'}}}));assert.throws(()=>clearEnquirySubmissionDraft(store,scope,id(9)));
 clearEnquirySubmissionDraft(store,scope,draft.requestKey);assert.equal(store.getItem(enquirySubmissionDraftKey(scope)),null);assert.notEqual(loadEnquirySubmissionDraft(store,scope).requestKey,draft.requestKey);
});
test('storage failures and malformed recovery cannot silently create another submission',()=>{
 const store=storage();store.setItem(enquirySubmissionDraftKey(scope),'bad');assert.throws(()=>loadEnquirySubmissionDraft(store,scope));assert.throws(()=>loadEnquirySubmissionDraft({getItem:()=>null,setItem:()=>{}},scope));
});
test('attachment selection requires latest checked file and exact session scope',()=>{
 const uploadScope={site:scope.site,form:scope.form,revision:scope.revision,request:id(4)},field={id:'cv',type:'file',mimeTypes:['application/pdf'],maxBytes:1000};
 let tracker=newEnquiryUploadTracker(uploadScope);const first={id:id(6),field:'cv',filename:'old.pdf',mime:'application/pdf',bytes:100,sha256:'a'.repeat(64)},second={...first,id:id(7),filename:'new.pdf'};tracker=trackEnquiryUpload(trackEnquiryUpload(tracker,first),second);
 const now=Date.now(),status={ok:true,status:'ok',session:{...uploadScope,id:tracker.session,state:'active',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+1800000).toISOString()},files:tracker.files.map(f=>({uploadId:f.id,field:f.field,filename:f.filename,mime:f.mime,bytes:f.bytes,state:f.id===first.id?'ready':'processing'}))};
 assert.throws(()=>selectEnquiryAttachments(uploadScope,tracker,status,[field]),/security checks/);status.files[1].state='ready';const selection=selectEnquiryAttachments(uploadScope,tracker,status,[field]);assert.deepEqual(selection.answers,{cv:second.id});assert.equal(selection.headers['x-cms-request'],uploadScope.request);
 assert.throws(()=>enquiryAttachmentHeaders({...uploadScope,request:id(9)},tracker));status.session.state='consumed';assert.throws(()=>selectEnquiryAttachments(uploadScope,tracker,status,[field]));assert.ok(enquiryAttachmentHeaders(uploadScope,tracker).Authorization);
});
