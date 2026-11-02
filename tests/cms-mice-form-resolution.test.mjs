import test from 'node:test';import assert from 'node:assert/strict';
import {resolveMiceForms,validateMiceFormCompatibility} from '../lib/cms/mice-form-resolution.ts';
import {projectMicePage} from '../lib/cms/mice-page.ts';
import {planMiceMigration,miceMigrationDependencies} from '../lib/cms/mice-migration.ts';
import {planContactFormMigration} from '../lib/cms/contact-form-migration.ts';
import {contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
import {acceptFormEnquiry} from '../lib/cms/enquiry-intake.ts';
const ids=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[site,form,revision,next,request,lead]=ids;
const definition=()=>structuredClone(planContactFormMigration(contactMigrationDependencies).forms.find(f=>f.variant==='corporate').definition);
const page=()=>projectMicePage({recordId:site,revisionId:revision,type:'page',payload:planMiceMigration(miceMigrationDependencies,[],form).previewPayload},{locale:'en',now:new Date('2026-10-23T00:00:00Z')});
const input=(id=form)=>({websiteId:site,formId:id,revisionId:revision,locale:'en',definition:definition()});
test('corporate form resolution pins same-site published revisions and returns only identities',async()=>{
 const p=page();p.requiredFormIds.push(next);const calls=[];const result=await resolveMiceForms(p,site,async(...args)=>{calls.push(args);return input(args[1]);});
 assert.deepEqual(calls,[[site,form],[site,next]]);assert.deepEqual(result.current,{recordId:form,revisionId:revision,locale:'en'});assert.equal(result.bindings.length,2);assert.equal(JSON.stringify(result).includes('definition'),false);
 assert.equal(validateMiceFormCompatibility(definition()).contentChecksPass,true);
});
test('corporate checks reject missing, renamed, conditional, wrong-type and changed-required fields',()=>{
 for(const name of ['name','email','phone','company','destination','message','consent']){
  const value=definition();value.fields=value.fields.filter(f=>f.id!==name);assert.equal(validateMiceFormCompatibility(value).contentChecksPass,false,name);
  const changed=definition();changed.fields.find(f=>f.id===name).required=!changed.fields.find(f=>f.id===name).required;assert.equal(validateMiceFormCompatibility(changed).contentChecksPass,false,name);
 }
 const hidden=definition();hidden.fields.find(f=>f.id==='message').showWhen={fieldId:'destination',optionId:'destination-1'};assert.equal(validateMiceFormCompatibility(hidden).contentChecksPass,false);
 const wrongType=definition();wrongType.fields.find(f=>f.id==='company').type='text';assert.equal(validateMiceFormCompatibility(wrongType).contentChecksPass,false);assert.equal(validateMiceFormCompatibility(null).contentChecksPass,false);
 const renamed=definition();renamed.fields.find(f=>f.id==='company').id='organization';assert.equal(validateMiceFormCompatibility(renamed).contentChecksPass,false);
 const noDefault=definition();delete noDefault.fields.find(f=>f.id==='destination').defaultOptionId;assert.equal(validateMiceFormCompatibility(noDefault).contentChecksPass,false);
 const copy=definition();copy.title='Client corporate enquiry';copy.fields.find(f=>f.id==='name').label='Your full name';assert.equal(validateMiceFormCompatibility(copy).contentChecksPass,true);
});
test('unpublished, cross-site, wrong-revision, wrong-locale and unsupported forms fail atomically',async()=>{
 for(const raw of [null,{}, {...input(),websiteId:next},{...input(),formId:next},{...input(),revisionId:'draft'},{...input(),locale:'fr'}])await assert.rejects(resolveMiceForms(page(),site,async()=>raw));
 const notifications=input();notifications.definition.notificationRouteIds=[site];const ready=await resolveMiceForms(page(),site,async()=>notifications);assert.deepEqual(ready.current,{recordId:form,revisionId:revision,locale:'en'});assert.equal(JSON.stringify(ready).includes('notificationRouteIds'),false);assert.equal(validateMiceFormCompatibility(notifications.definition).contentChecksPass,false);
 const scheduled=page();scheduled.requiredFormIds.push(next);await assert.rejects(resolveMiceForms(scheduled,site,async(_site,id)=>id===form?input():null),/not published/);
 let calls=0;for(const dependencies of [[],[form,form],[next]])await assert.rejects(resolveMiceForms({...page(),requiredFormIds:dependencies},site,async()=>{calls++;return input();}));assert.equal(calls,0);
});
test('corporate intake retains company, destination choice, brief, consent version and source attribution',async()=>{
 const def=definition(),dest=def.fields.find(f=>f.id==='destination');let persisted;
 const command={formId:form,revisionId:revision,requestKey:request,sourcePath:'/mice',challengeToken:'fixture',answers:{name:' Client ',email:'client@example.com',phone:'+91 9876543210',company:' Client company ',destination:dest.options[2].id,message:' Thirty guests in March. ',consent:true}};
 const adapter={consumeRate:async()=>({allowed:true,retryAfter:0}),verifyChallenge:async()=>true,read:async()=>({websiteId:site,formId:form,revisionId:revision,definition:def}),files:async()=>[],persist:async value=>{persisted=value;return {leadId:lead,receivedAt:'2026-10-23T00:00:00Z',replayed:false};}};
 assert.equal((await acceptFormEnquiry(command,site,adapter)).status,200);assert.equal(persisted.answers.company,'Client company');assert.equal(persisted.answers.message,'Thirty guests in March.');assert.equal(persisted.answers.destination,dest.options[2].id);assert.equal(dest.options[2].label,'International');assert.deepEqual(persisted.attribution,{sourcePath:'/mice'});assert.equal(persisted.consents[0].textVersion,def.fields.find(f=>f.id==='consent').textVersion);assert.equal(persisted.consents[0].accepted,true);
 persisted=null;assert.equal((await acceptFormEnquiry({...command,answers:{...command.answers,consent:false}},site,adapter)).status,422);assert.equal(persisted,null);
});
