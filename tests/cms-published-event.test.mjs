import test from 'node:test';import assert from 'node:assert/strict';
import {newEvent} from '../lib/cms/events.ts';import {projectPublishedEvent} from '../lib/cms/published-event.ts';
const id='11111111-1111-4111-8111-111111111111';
const {internalNotes,relationships,...payload}={...newEvent(),slug:'example',summary:'Summary',organizer:'Organizer',category:'Workshop',attendance:'online',onlineUrl:'https://example.test/event',timing:{mode:'allDay',start:'2026-12-01',end:'2026-12-01'},body:[{id:'body',kind:'paragraph',text:'Body'}]};
const envelope={recordId:id,revisionId:id,type:'event',path:'/events/example',locale:'en',payload,related:[]};
test('public events reject private data and incomplete or inconsistent event details',()=>{
 assert.deepEqual(projectPublishedEvent(envelope,envelope.path).content.timing,payload.timing);
 for(const patch of [{internalNotes:'private'},{relationships},{body:[]},{organizer:''},{timing:{mode:'timed',start:'',end:''}},{attendance:'hybrid'},{onlineUrl:'http://example.test'},{status:'cancelled',statusNote:'Cancelled',registration:{enabled:true,label:'Register',href:'https://example.test'}}])assert.throws(()=>projectPublishedEvent({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedEvent({...envelope,ownerId:id},envelope.path));assert.throws(()=>projectPublishedEvent(envelope,'/events/other'));assert.throws(()=>projectPublishedEvent(envelope,envelope.path,'fr'));
 const cancelled={...payload,status:'cancelled',statusNote:'Cancelled'};assert.equal(projectPublishedEvent({...envelope,payload:cancelled},envelope.path).content.status,'cancelled');
});
test('public event cards require typed safe routes without duplicates or private fields',()=>{
 const card={type:'project',title:'Project',href:'/projects/example'};
 assert.deepEqual(projectPublishedEvent({...envelope,related:[card]},envelope.path).related,[card]);
 for(const related of [[{...card,href:'https://example.test'}],[{...card,recordId:id}],[card,card],[{type:'page',title:'Self',href:envelope.path}],[{type:'document',title:'File',href:'/api/documents/download?record=private'}]])assert.throws(()=>projectPublishedEvent({...envelope,related},envelope.path));
});
