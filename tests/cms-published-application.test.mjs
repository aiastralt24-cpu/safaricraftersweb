import test from 'node:test';import assert from 'node:assert/strict';
import {newApplication} from '../lib/cms/applications.ts';import {projectPublishedApplication} from '../lib/cms/published-application.ts';
const id='11111111-1111-4111-8111-111111111111';
const {internalNotes,relationships,claims,...payload}={...newApplication(),slug:'example',summary:'Summary',body:[{id:'intro',kind:'paragraph',text:'Overview'}]};
const envelope={recordId:id,revisionId:id,type:'application',path:'/applications/example',locale:'en',payload,related:[]};
test('public applications exclude private evidence and bind classification to route',()=>{
 assert.equal(projectPublishedApplication(envelope,envelope.path).content.title,'New application');
 for(const patch of [{internalNotes:'Private'},{relationships},{claims},{summary:''},{body:[]},{kind:'unknown'}])assert.throws(()=>projectPublishedApplication({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedApplication({...envelope,payload:{...payload,kind:'industry'}},envelope.path));
 assert.equal(projectPublishedApplication({...envelope,path:'/industries/example',payload:{...payload,kind:'industry'}},'/industries/example').content.kind,'industry');
 assert.throws(()=>projectPublishedApplication(envelope,envelope.path,'fr'));
});
test('application cards reject unsupported, private, duplicate and self routes',()=>{
 for(const related of [[{type:'application',title:'Industry',href:'/industries/other'}],[{type:'project',title:'Project',href:'/projects/other'}]])assert.equal(projectPublishedApplication({...envelope,related},envelope.path).related.length,1);
 const card={type:'application',title:'Other',href:'/applications/other'};
 for(const related of [[{...card,href:envelope.path}],[{...card,href:'/cms/private'}],[{...card,href:'https://evil.test'}],[card,card],[{...card,type:'product'}]])assert.throws(()=>projectPublishedApplication({...envelope,related},envelope.path));
});
