import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnquiryFileCredential,authorizeEnquiryFileSession,resolveEnquiryFilePolicy} from '../lib/cms/enquiry-file-session.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scope={site:id(1),form:id(2),revision:id(3),request:id(4)},now=Date.parse('2026-10-30T12:00:00Z');
function fixture(){const credential=createEnquiryFileCredential();return {...credential,session:{...scope,id:id(5),tokenHash:credential.tokenHash,createdAt:'2026-10-30T12:00:00Z',expiresAt:'2026-10-30T12:30:00Z',state:'active'}};}
test('attachment credentials use independent random bearer secrets and return no hash after authorization',()=>{
 const a=fixture(),b=fixture();assert.notEqual(a.token,b.token);assert.notEqual(a.tokenHash,a.token);assert.match(a.token,/^[a-f0-9]{64}$/);
 const checked=authorizeEnquiryFileSession(a.session,scope,a.token,now);assert.equal(checked.id,id(5));assert.equal(checked.tokenHash,undefined);
 assert.equal(authorizeEnquiryFileSession(a.session,scope,b.token,now),null);
 for(const token of [undefined,{},'',a.tokenHash,'f'.repeat(63)])assert.equal(authorizeEnquiryFileSession(a.session,scope,token,now),null);
});
test('attachment sessions enforce every scope component, state and inclusive expiry boundary',()=>{
 const f=fixture();for(const key of Object.keys(scope))assert.equal(authorizeEnquiryFileSession(f.session,{...scope,[key]:id(9)},f.token,now),null);
 for(const state of ['cancelled','consumed'])assert.equal(authorizeEnquiryFileSession({...f.session,state},scope,f.token,now),null);
 assert.ok(authorizeEnquiryFileSession(f.session,scope,f.token,now+1_799_999));
 for(const time of [now-1,now+1_800_000,NaN,Infinity])assert.equal(authorizeEnquiryFileSession(f.session,scope,f.token,time),null);
 for(const patch of [{expiresAt:'2026-10-30T12:30:01Z'},{expiresAt:f.session.createdAt},{tokenHash:'bad'},{unexpected:true}])assert.equal(authorizeEnquiryFileSession({...f.session,...patch},scope,f.token,now),null);
});
test('file reservations use the pinned form field limits and reject forged policy or unsafe names',()=>{
 const definition={schemaVersion:1,title:'Application',fields:[{id:'cv',type:'file',label:'CV',help:'',required:true,validationMessage:'',mimeTypes:['application/pdf'],maxBytes:1000}],submitLabel:'Apply',successMessage:'Received',notificationRouteIds:[]};
 const input={field:'cv',filename:'resume.pdf',mime:'application/pdf',bytes:1000,sha256:'a'.repeat(64)};
 assert.deepEqual(resolveEnquiryFilePolicy(definition,input),{...input,maxBytes:1000});
 for(const patch of [{bytes:1001},{bytes:0},{bytes:1.5},{field:'other'},{maxBytes:9999},{mime:'image/png'},{filename:'resume.png'},{filename:'../resume.pdf'},{filename:'.resume.pdf'},{filename:'resume.pdf\n'},{sha256:'bad'}])assert.equal(resolveEnquiryFilePolicy(definition,{...input,...patch}),null);
 assert.equal(resolveEnquiryFilePolicy({...definition,fields:[...definition.fields,...definition.fields]},input),null);
 assert.equal(resolveEnquiryFilePolicy(null,input),null);
});
