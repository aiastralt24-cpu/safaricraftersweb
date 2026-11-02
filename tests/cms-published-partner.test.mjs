import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';import {projectPublishedPartner} from '../lib/cms/published-partner.ts';
const id='11111111-1111-4111-8111-111111111111';
const {internalNotes,relationships,...payload}={...newPartner(),slug:'example',summary:'Summary',services:['Repairs'],coverage:[{countryCode:'IN',regions:[]}],contact:{email:'support@example.com',phone:'',website:''}};
const envelope={recordId:id,revisionId:id,type:'partner',path:'/partners/example',locale:'en',payload,related:[]};
test('public partners reject private fields, incomplete partner details and mismatched identities',()=>{
 assert.equal(projectPublishedPartner(envelope,envelope.path).content.services[0],'Repairs');
 for(const patch of [{internalNotes:'Private'},{relationships},{summary:''},{coverage:[]},{status:'inactive'},{kind:'unknown'}])assert.throws(()=>projectPublishedPartner({...envelope,payload:{...payload,...patch}},envelope.path));
 for(const patch of [{type:'application'},{path:'/partners/other'},{locale:'fr'}])assert.throws(()=>projectPublishedPartner({...envelope,...patch},envelope.path));
 assert.throws(()=>projectPublishedPartner(envelope,envelope.path,'fr'));
});
test('partner related cards allow visitor routes only with no duplicate or private links',()=>{
 for(const related of [[{type:'application',title:'Industry',href:'/industries/other'}],[{type:'location',title:'Location',href:'/locations/other'}]])assert.equal(projectPublishedPartner({...envelope,related},envelope.path).related.length,1);
 const card={type:'application',title:'Other',href:'/applications/other'};
 for(const related of [[{...card,href:'/cms/private'}],[{...card,href:'https://evil.test'}],[card,card],[{...card,type:'product'}]])assert.throws(()=>projectPublishedPartner({...envelope,related},envelope.path));
});
