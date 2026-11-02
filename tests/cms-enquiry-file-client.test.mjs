import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {newEnquiryUploadTracker,parseEnquiryUploadTracker,persistEnquiryUploadTracker,enquiryUploadStorageKey,describeEnquiryUpload,trackEnquiryUpload,checkEnquiryUploadSessionResponse,checkEnquiryUploadStatus,checkEnquiryUploadCancellation} from '../lib/cms/enquiry-file-client.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,scope={site:id(1),form:id(2),revision:id(3),request:id(4)};
function session(t,state='active'){return {...scope,id:t.session,state,createdAt:'2026-10-30T12:00:00Z',expiresAt:'2026-10-30T12:30:00Z'};}
test('browser recovery generates independent secrets, scopes persisted credentials and confirms writes',()=>{
 const a=newEnquiryUploadTracker(scope,webcrypto),b=newEnquiryUploadTracker(scope,webcrypto);assert.notEqual(a.secret,b.secret);assert.notEqual(a.session,b.session);assert.match(a.secret,/^[a-f0-9]{64}$/);
 const saved=new Map(),storage={setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null};persistEnquiryUploadTracker(storage,a);assert.deepEqual(parseEnquiryUploadTracker(storage.getItem(enquiryUploadStorageKey(scope)),scope),a);
 for(const key of Object.keys(scope))assert.throws(()=>parseEnquiryUploadTracker(JSON.stringify(a),{...scope,[key]:id(9)}));
 for(const text of ['{','x'.repeat(50001),JSON.stringify({...a,extra:true}),JSON.stringify({...a,secret:'bad'})])assert.throws(()=>parseEnquiryUploadTracker(text,scope));
 assert.throws(()=>persistEnquiryUploadTracker({setItem(){throw Error('quota');},getItem:()=>null},a));assert.throws(()=>persistEnquiryUploadTracker({setItem(){},getItem:()=>null},a));
});
test('file descriptors hash actual bytes and keep stable upload identities without storing file contents',async()=>{
 const file=new File(['resume'],'resume.pdf',{type:'application/pdf'}),descriptor=await describeEnquiryUpload(file,'cv',id(6),webcrypto);assert.equal(descriptor.bytes,6);assert.equal(descriptor.sha256.length,64);
 const tracker=trackEnquiryUpload(newEnquiryUploadTracker(scope,webcrypto),descriptor);assert.deepEqual(trackEnquiryUpload(tracker,descriptor),tracker);assert.equal(tracker.files.length,1);assert.equal(tracker.files[0].content,undefined);
 for(const patch of [{filename:'other.pdf'},{sha256:'f'.repeat(64)},{field:'other'}])assert.throws(()=>trackEnquiryUpload(tracker,{...descriptor,...patch}));
 for(const file of [new File([''],'empty.pdf',{type:'application/pdf'}),new File(['x'],'wrong.png',{type:'application/pdf'}),new File(['x'],'unsafe.html',{type:'text/html'}),new File(['x'],'../cv.pdf',{type:'application/pdf'})])await assert.rejects(()=>describeEnquiryUpload(file,'cv',id(7),webcrypto));
});
test('session and cancellation responses must match every scope field and terminal state',()=>{
 const t=newEnquiryUploadTracker(scope,webcrypto),s=session(t);assert.equal(checkEnquiryUploadSessionResponse({ok:true,status:'created',session:s},t).session.id,t.session);
 for(const patch of [{id:id(9)},{site:id(9)},{form:id(9)},{revision:id(9)},{request:id(9)},{tokenHash:'a'.repeat(64)},{expiresAt:'2026-10-30T12:31:00Z'}])assert.throws(()=>checkEnquiryUploadSessionResponse({ok:true,status:'recovered',session:{...s,...patch}},t));
 assert.throws(()=>checkEnquiryUploadCancellation({ok:true,status:'cancelled',session:s},t));assert.equal(checkEnquiryUploadCancellation({ok:true,status:'cancelled',session:session(t,'cancelled')},t).session.state,'cancelled');
});
test('status rejects unknown, duplicated or changed uploads while allowing unresolved missing reservations',async()=>{
 const descriptor=await describeEnquiryUpload(new File(['resume'],'resume.pdf',{type:'application/pdf'}),'cv',id(6),webcrypto),t=trackEnquiryUpload(newEnquiryUploadTracker(scope,webcrypto),descriptor);
 const f={uploadId:descriptor.id,field:descriptor.field,filename:descriptor.filename,mime:descriptor.mime,bytes:descriptor.bytes,state:'ready'},status={ok:true,status:'ok',session:session(t),files:[f]};assert.equal(checkEnquiryUploadStatus(status,t).files[0].state,'ready');assert.deepEqual(checkEnquiryUploadStatus({...status,files:[]},t).files,[]);
 for(const files of [[f,f],[{...f,uploadId:id(9)}],[{...f,field:'other'}],[{...f,bytes:7}],[{...f,filename:'other.pdf'}],[{...f,storageKey:'private'}]])assert.throws(()=>checkEnquiryUploadStatus({...status,files},t));
});
test('tracker enforces cumulative quota and unique identities',()=>{const t=newEnquiryUploadTracker(scope,webcrypto),file={id:id(6),field:'cv',filename:'cv.pdf',mime:'application/pdf',bytes:25000000,sha256:'b'.repeat(64)};let current=t;for(let n=6;n<10;n++)current=trackEnquiryUpload(current,{...file,id:id(n)});assert.throws(()=>trackEnquiryUpload(current,{...file,id:id(10)}));assert.throws(()=>parseEnquiryUploadTracker(JSON.stringify({...t,files:[file,file]}),scope));});
test('recovery storage refuses to overwrite unresolved identities and clears only confirmed cancellation',async()=>{
 const {clearCancelledEnquiryUpload}=await import('../lib/cms/enquiry-file-client.ts');const saved=new Map(),storage={setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null,removeItem:k=>saved.delete(k)},a=newEnquiryUploadTracker(scope,webcrypto),b=newEnquiryUploadTracker(scope,webcrypto);
 persistEnquiryUploadTracker(storage,a);assert.throws(()=>persistEnquiryUploadTracker(storage,b));assert.throws(()=>clearCancelledEnquiryUpload(storage,a,{ok:true,status:'cancelled',session:session(a)}));assert.equal(saved.size,1);
 assert.throws(()=>clearCancelledEnquiryUpload(storage,b,{ok:true,status:'cancelled',session:session(b,'cancelled')}));assert.equal(saved.size,1);
 clearCancelledEnquiryUpload(storage,a,{ok:true,status:'cancelled',session:session(a,'cancelled')});assert.equal(saved.size,0);
 const file={id:id(7),field:'cv',filename:'cv.pdf',mime:'application/pdf',bytes:100,sha256:'b'.repeat(64)},tracked=trackEnquiryUpload(a,file);persistEnquiryUploadTracker(storage,tracked);assert.throws(()=>persistEnquiryUploadTracker(storage,a));
});
test('reservation response must match the tracked file before transfer starts',async()=>{
 const {checkEnquiryUploadReservation}=await import('../lib/cms/enquiry-file-client.ts'),f={id:id(6),field:'cv',filename:'cv.pdf',mime:'application/pdf',bytes:10,sha256:'a'.repeat(64)},t=trackEnquiryUpload(newEnquiryUploadTracker(scope,webcrypto),f),receipt={ok:true,status:'reserved',file:{uploadId:f.id,field:f.field,filename:f.filename,mime:f.mime,bytes:f.bytes,state:'reserved'}};
 assert.equal(checkEnquiryUploadReservation(receipt,t,f.id).file.uploadId,f.id);for(const patch of [{uploadId:id(9)},{field:'other'},{bytes:11},{filename:'other.pdf'},{storageKey:'private'}])assert.throws(()=>checkEnquiryUploadReservation({...receipt,file:{...receipt.file,...patch}},t,f.id));
});
