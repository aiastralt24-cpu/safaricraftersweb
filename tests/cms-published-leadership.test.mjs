import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';import {projectPublishedLeadership} from '../lib/cms/published-leadership.ts';
const id='11111111-1111-4111-8111-111111111111';
const {internalNotes,relationships,...payload}={...newLeadership(),slug:'example',summary:'Summary',role:'Director',body:[{id:'bio',kind:'paragraph',text:'Biography'}]};
const envelope={recordId:id,revisionId:id,type:'leadership',path:'/leadership/example',locale:'en',payload,related:[]};
test('public leadership projection rejects private data and incomplete or inconsistent profiles',()=>{
 assert.equal(projectPublishedLeadership(envelope,envelope.path).content.role,'Director');
 for(const patch of [{internalNotes:'Private'},{relationships},{role:''},{summary:''},{body:[]},{status:'unknown'}])assert.throws(()=>projectPublishedLeadership({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedLeadership({...envelope,ownerId:id},envelope.path));assert.throws(()=>projectPublishedLeadership(envelope,'/leadership/other'));assert.throws(()=>projectPublishedLeadership(envelope,envelope.path,'fr'));
});
test('leadership public related cards require typed safe routes and no private metadata',()=>{
 const card={type:'project',title:'Project',href:'/projects/example'};assert.deepEqual(projectPublishedLeadership({...envelope,related:[card]},envelope.path).related,[card]);
 for(const related of [[card,card],[{...card,href:'https://example.test'}],[{...card,recordId:id}],[{type:'page',title:'Self',href:envelope.path}],[{type:'document',title:'File',href:'/api/documents/download?record=private'}]])assert.throws(()=>projectPublishedLeadership({...envelope,related},envelope.path));
});
