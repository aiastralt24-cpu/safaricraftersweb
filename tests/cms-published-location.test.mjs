import test from 'node:test';import assert from 'node:assert/strict';
import {newLocation} from '../lib/cms/locations.ts';import {projectPublishedLocation} from '../lib/cms/published-location.ts';
const id='11111111-1111-4111-8111-111111111111';
const {internalNotes,relationships,...payload}={...newLocation(),slug:'example',summary:'Summary',address:{lines:['Example office'],locality:'Example city',region:'',postalCode:'',countryCode:'IN'},visiting:'noPublicAccess'};
const envelope={recordId:id,revisionId:id,type:'location',path:'/locations/example',locale:'en',payload,related:[]};
test('public locations reject private fields, incomplete addresses and mismatched identities',()=>{
 assert.equal(projectPublishedLocation(envelope,envelope.path).content.address.locality,'Example city');
 for(const patch of [{internalNotes:'Private'},{relationships},{summary:''},{address:{...payload.address,lines:[]}},{visiting:'unspecified'},{kind:'unknown'}])assert.throws(()=>projectPublishedLocation({...envelope,payload:{...payload,...patch}},envelope.path));
 for(const patch of [{type:'application'},{path:'/locations/other'},{locale:'fr'}])assert.throws(()=>projectPublishedLocation({...envelope,...patch},envelope.path));
 assert.throws(()=>projectPublishedLocation(envelope,envelope.path,'fr'));
});
test('location related cards allow visitor routes only with no duplicate or private links',()=>{
 for(const related of [[{type:'application',title:'Industry',href:'/industries/other'}],[{type:'project',title:'Project',href:'/projects/other'}]])assert.equal(projectPublishedLocation({...envelope,related},envelope.path).related.length,1);
 const card={type:'application',title:'Other',href:'/applications/other'};
 for(const related of [[{...card,href:'/cms/private'}],[{...card,href:'https://evil.test'}],[card,card],[{...card,type:'product'}]])assert.throws(()=>projectPublishedLocation({...envelope,related},envelope.path));
});
