import test from 'node:test';import assert from 'node:assert/strict';
import {projectExpeditionPage} from '../lib/cms/expedition-page.ts';import {projectSpecialistPage} from '../lib/cms/specialist-page.ts';
import {createExpeditionDirectorySection,createSpecialistDirectorySection} from '../lib/cms/section-drafts.ts';import {validateStoredContent} from '../lib/cms/content-validation.ts';
const id='00000000-0000-4000-8000-000000000001',rev='00000000-0000-4000-8000-000000000002';
test('directory templates render pinned downloads with trusted evidence and retain directory/heading constraints',()=>{
 for(const [path,create,project]of [['/photo-expeditions',createExpeditionDirectorySection,projectExpeditionPage],['/specialists',createSpecialistDirectorySection,projectSpecialistPage]]){
  const payload={composition:{schemaVersion:1,title:'Directory',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Meet the field team',body:[]}},create('directory'),{id:'files',kind:'downloads',controls:{label:'Documents',headingLevel:'h2'},data:{title:'Resources',items:[{id:'guide',label:'Download guide',document:{recordId:id},versionId:rev}]}}]}};
  const record={type:'page',path,locale:'en',payload,downloadStatus:[{recordId:id,versionId:rev,available:true}]};assert.equal(validateStoredContent(record).contentChecksPass,true);assert.equal(validateStoredContent({...record,downloadStatus:undefined}).contentChecksPass,false);
  const page=project({recordId:id,revisionId:rev,type:'page',payload},{locale:'en',now:new Date()});assert.equal(page.sections[2].kind,'downloads');assert.equal(page.sections[2].data.items[0].versionId,rev);
  for(const change of [p=>p.composition.sections.splice(1,1),p=>p.composition.sections[2].controls.headingLevel='h1',p=>p.composition.sections[2].data.items[0].label=' ']){const invalid=structuredClone(payload);change(invalid);assert.equal(validateStoredContent({...record,payload:invalid}).contentChecksPass,false);assert.throws(()=>project({recordId:id,revisionId:rev,type:'page',payload:invalid},{locale:'en',now:new Date()}));}
 }
});
