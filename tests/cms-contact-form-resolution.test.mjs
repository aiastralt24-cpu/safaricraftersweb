import test from 'node:test';import assert from 'node:assert/strict';
import {resolveContactForms} from '../lib/cms/contact-form-resolution.ts';
import {projectContactPage} from '../lib/cms/contact-page.ts';
import {planContactMigration,contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
import {planContactFormMigration} from '../lib/cms/contact-form-migration.ts';
import {newFormField} from '../lib/cms/form-drafts.ts';
const site='00000000-0000-4000-8000-000000000001',form='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003',next='00000000-0000-4000-8000-000000000004';
function page(){const payload=structuredClone(planContactMigration(contactMigrationDependencies).previewPayload);payload.composition.sections[1].data.form={recordId:form};return projectContactPage({recordId:site,revisionId:revision,type:'page',payload},{locale:'en',now:new Date('2026-10-23')});}
const input=(id=form)=>({websiteId:site,formId:id,revisionId:revision,locale:'en',definition:planContactFormMigration(contactMigrationDependencies).forms[0].definition});
test('contact form resolver pins current and scheduled same-site published revisions and exposes identities only',async()=>{
 const projected=page();projected.requiredFormIds.push(next);const calls=[];
 const result=await resolveContactForms(projected,site,async(...args)=>{calls.push(args);return input(args[1]);});
 assert.deepEqual(calls,[[site,form],[site,next]]);assert.deepEqual(result.current,{recordId:form,revisionId:revision,locale:'en'});assert.equal(result.bindings.length,2);assert.equal(JSON.stringify(result).includes('definition'),false);assert.equal(JSON.stringify(result).includes('successMessage'),false);
});
test('missing, wrong-site, wrong-identity, wrong-locale and invalid forms cannot resolve',async()=>{
 for(const raw of [null,{}, {...input(),websiteId:next},{...input(),formId:next},{...input(),locale:'fr'},{...input(),revisionId:'draft'}, {...input(),definition:{...input().definition,unknown:true}}])await assert.rejects(resolveContactForms(page(),site,async()=>raw));
 await assert.rejects(resolveContactForms(page(),site,async()=>{throw Error('offline');}),/offline/);
 const scheduled=page();scheduled.requiredFormIds.push(next);await assert.rejects(resolveContactForms(scheduled,site,async(_site,id)=>id===form?input():null),/not published/);
});
test('attachments remain unsupported while eligible published notification forms expose identities only',async()=>{
 const files=input();files.definition.fields.push(newFormField('file','attachment'));await assert.rejects(resolveContactForms(page(),site,async()=>files),/unsupported/);
 const notifications=input();notifications.definition.notificationRouteIds=[site];const value=await resolveContactForms(page(),site,async()=>notifications);assert.deepEqual(value.current,{recordId:form,revisionId:revision,locale:'en'});assert.equal(JSON.stringify(value).includes('notificationRouteIds'),false);await assert.rejects(resolveContactForms(page(),site,async()=>null),/not published/);
});
test('invalid site and inconsistent dependencies fail before reading any form',async()=>{
 let calls=0;const read=async()=>{calls++;return input();};await assert.rejects(resolveContactForms(page(),'invalid',read));
 for(const ids of [[],[form,form],[next],['bad']])await assert.rejects(resolveContactForms({...page(),requiredFormIds:ids},site,read));assert.equal(calls,0);
});
