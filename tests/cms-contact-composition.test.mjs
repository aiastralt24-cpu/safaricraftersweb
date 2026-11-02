import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition,editCompositionDraft} from '../lib/cms/composition.ts';
import {createContactSection} from '../lib/cms/contact-section-drafts.ts';
import {contactSectionKinds} from '../lib/cms/contact-content.ts';
import {planContactMigration,contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
test('contact draft composition validates and duplicates safely without authorizing public delivery',()=>{
 const proposal=planContactMigration(contactMigrationDependencies),page=proposal.previewComposition;
 assert.equal(validateComposition(page).valid,true);assert.deepEqual(page.sections.map(s=>s.kind),contactSectionKinds);assert.equal(page.sections[0].controls.headingLevel,'h1');assert.equal(proposal.readyToApply,false);
 const duplicate=editCompositionDraft(page,{type:'duplicate',id:page.sections[0].id,newId:'copy'});assert.equal(duplicate.sections.find(s=>s.id==='copy').controls.visible,false);
 const checked=validateStoredContent({type:'page',path:'/contact',locale:'en',payload:{composition:page}});assert.equal(checked.contentChecksPass,false);
});
test('contact authoring provides an empty starter and distinct incomplete media/email controls',()=>{
 assert.deepEqual(pageSectionOptions('page','/contact'),contactSectionKinds);assert.deepEqual(createPageTemplate('contact').composition.sections,[]);
 assert.equal(pageSectionOptions('page','/about').some(kind=>contactSectionKinds.includes(kind)),false);
 for(const kind of contactSectionKinds){const section=createContactSection(kind,'section');assert.equal(validateComposition({schemaVersion:1,title:'Contact',sections:[section]}).valid,kind==='contactEnquiry');}
});
test('contact enquiry drafts accept only explicit form identities and retain unsupported publication status',()=>{
 const proposal=planContactMigration(contactMigrationDependencies),page=proposal.previewComposition,section=page.sections.find(s=>s.kind==='contactEnquiry');
 section.data.form={recordId:'00000000-0000-4000-8000-000000000001'};assert.equal(validateComposition(page).valid,true);
 assert.equal(validateStoredContent({type:'page',path:'/contact',locale:'en',payload:{composition:page}}).contentChecksPass,false);
 for(const form of [{recordId:'invalid'},{recordId:'00000000-0000-4000-8000-000000000001',published:true},{recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002'}]){section.data.form=form;assert.equal(validateComposition(page).valid,false);}
 delete section.data.form;assert.equal(validateComposition(page).valid,true);
});
