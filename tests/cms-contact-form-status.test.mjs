import test from 'node:test';import assert from 'node:assert/strict';import {contactFormFindings} from '../lib/cms/contact-form-status.ts';import {planContactMigration,contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
function page(){const p=planContactMigration(contactMigrationDependencies).previewComposition;p.sections[1].data.form={recordId:id};return p;}
const row={recordId:id,revisionId:revision,locale:'en',available:true};
test('contact evidence requires a complete nonduplicated matching snapshot',()=>{
 assert.deepEqual(contactFormFindings(page(),[row]),[]);for(const status of [undefined,[],[row,row],[{...row,recordId:revision}]])assert.equal(contactFormFindings(page(),status).length,1);
 for(const patch of [{available:false},{revisionId:null},{locale:'fr'}])assert.equal(contactFormFindings(page(),[{...row,...patch}])[0].code,'contact_form_unavailable');
});
test('scheduled dependencies require evidence while hidden panels do not add dependencies',()=>{
 const p=page(),future=structuredClone(p.sections[1]);future.id='future';future.data.form.recordId=revision;future.controls.visibleFrom='2099-01-01T00:00:00Z';p.sections.push(future);assert.equal(contactFormFindings(p,[row])[0].code,'contact_form_evidence_mismatch');future.controls.visible=false;assert.deepEqual(contactFormFindings(p,[row]),[]);
});
