import test from 'node:test';import assert from 'node:assert/strict';
import {projectContactPage,readPublishedContactPage} from '../lib/cms/contact-page.ts';
import {planContactMigration,contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
const site='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002',form='00000000-0000-4000-8000-000000000003',other='00000000-0000-4000-8000-000000000004';
const context={locale:'en',now:new Date('2026-10-23T00:00:00Z')};
function envelope(){const payload=structuredClone(planContactMigration(contactMigrationDependencies).previewPayload);payload.composition.sections[1].data.form={recordId:form};return {recordId:site,revisionId:revision,type:'page',payload};}
test('contact projection preserves source content, metadata and explicit current/future form dependencies',()=>{
 const input=envelope(),page=projectContactPage(input,context);assert.equal(page.path,'/contact');assert.equal(page.formId,form);assert.deepEqual(page.requiredFormIds,[form]);assert.equal(page.sections.length,2);assert.equal(page.seo.canonical,input.payload.seo.canonical);assert.deepEqual(page.sections[0].data,input.payload.composition.sections[0].data);assert.equal('payload'in page,false);
 const next=structuredClone(input.payload.composition.sections[1]);next.id='replacement';next.data.form.recordId=other;next.controls.visibleFrom='2026-11-01T00:00:00Z';input.payload.composition.sections[1].controls.visibleUntil=next.controls.visibleFrom;input.payload.composition.sections.push(next);
 assert.deepEqual(projectContactPage(input,context).requiredFormIds,[form,other]);assert.equal(projectContactPage(input,{...context,now:new Date(next.controls.visibleFrom)}).formId,other);
});
test('contact projection rejects missing forms, unsupported sections, region targeting, schedule gaps and duplicate headings',()=>{
 const mutations=[p=>delete p.composition.sections[1].data.form,p=>p.composition.sections[1].controls.visible=false,p=>p.composition.sections[1].controls.headingLevel='h1',p=>p.composition.sections[0].controls.headingLevel='h2',p=>p.composition.sections[0].controls.regions=['india'],p=>p.composition.sections[1].controls.visibleUntil='2026-11-01T00:00:00Z',p=>p.composition.sections.push({id:'extra',kind:'text',controls:{label:'Extra'},data:{body:[]}}),p=>p.secret='not projected'];
 for(const mutate of mutations){const input=envelope();mutate(input.payload);assert.throws(()=>projectContactPage(input,context));}
 assert.throws(()=>projectContactPage(envelope(),{...context,locale:'fr'}));assert.throws(()=>projectContactPage(envelope(),{...context,now:new Date('invalid')}));
 const hidden=envelope();hidden.payload.composition.sections.push({id:'hidden',kind:'text',controls:{visible:false,label:'Saved draft'},data:{body:[]}});assert.equal(projectContactPage(hidden,context).sections.length,2);
});
test('contact published reader fixes route/site/locale, distinguishes withdrawal and errors, and rejects bad context before IO',async()=>{
 const calls=[];const config={site,readPage:async(...args)=>{calls.push(args);return envelope();}};assert.equal((await readPublishedContactPage(config,context)).formId,form);assert.deepEqual(calls,[[site,'/contact','en']]);
 assert.equal(await readPublishedContactPage({...config,readPage:async()=>null},context),null);await assert.rejects(readPublishedContactPage({...config,readPage:async()=>{throw Error('offline');}},context),/offline/);
 await assert.rejects(readPublishedContactPage({...config,site:'invalid'},context));await assert.rejects(readPublishedContactPage(config,{...context,locale:'fr'}));assert.equal(calls.length,1);
});
test('advisory contact checks report structural gaps but never enable release',async()=>{
 const {contactPageFindings}=await import('../lib/cms/contact-page-validation.ts');const {validateStoredContent}=await import('../lib/cms/content-validation.ts');
 const record={type:'page',path:'/contact',locale:'en',payload:envelope().payload};assert.equal(contactPageFindings(record,context.now).some(f=>f.severity==='error'),false);
 delete record.payload.composition.sections[1].data.form;assert.ok(contactPageFindings(record,context.now).some(f=>f.code==='contact_page_structure'&&f.message.includes('form reference')));assert.equal(validateStoredContent(record).contentChecksPass,false);
 assert.ok(contactPageFindings({...record,path:'/other'},context.now).some(f=>f.code==='contact_page_route'));
});
