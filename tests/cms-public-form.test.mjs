import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublicForm,handlePublicFormRead} from '../lib/cms/public-form.ts';
import {newForm,newFormField} from '../lib/cms/form-drafts.ts';
const site='00000000-0000-4000-8000-000000000001',formId='00000000-0000-4000-8000-000000000002';
const definition=newForm('name');definition.notificationRouteIds=[site];definition.redirectPath='/thanks';
const stored={websiteId:site,formId,revisionId:site,locale:'en',definition};
test('public projection includes pinned fields but never private routing or success configuration',()=>{
 const value=projectPublicForm(stored,site,formId,'public-site-key');assert.equal(value.formId,formId);assert.equal(value.fields[0].id,'name');assert.equal(value.challenge.action,'cms_enquiry');assert.equal('notificationRouteIds' in value,false);assert.equal('definition' in value,false);assert.equal('redirectPath' in value,false);assert.equal('successMessage' in value,false);
 assert.equal(projectPublicForm(stored,formId,formId,'key'),null);assert.equal(projectPublicForm({...stored,definition:{...definition,script:'injected'}},site,formId,'key'),null);assert.equal(projectPublicForm({...stored,definition:{...definition,fields:[newFormField('file','upload')]}},site,formId,'key'),null);
});
test('public lookup uses server site, rejects query overrides and does not cache withdrawn forms',async()=>{
 const request=url=>new Request(url);let args;const config={site,siteKey:'key',read:async(...input)=>{args=input;return stored;}};
 const response=await handlePublicFormRead(request('https://example.test/form'),formId,config);assert.equal(response.status,200);assert.deepEqual(args,[site,formId]);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handlePublicFormRead(request('https://example.test/form?site=other'),formId,config)).status,400);
 assert.equal((await handlePublicFormRead(request('https://example.test/form'),formId,{...config,read:async()=>null})).status,404);
 assert.equal((await handlePublicFormRead(request('https://example.test/form'),formId,null)).status,503);
});
test('public form delivery preserves optional placeholders from the selected revision',async()=>{
 const copy=structuredClone(stored);copy.definition.fields[0].placeholder='e.g. Your full name';
 const response=await handlePublicFormRead(new Request('https://example.test/form'),formId,{site,siteKey:'key',read:async()=>copy});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.form.fields[0].placeholder,'e.g. Your full name');assert.equal(body.form.revisionId,copy.revisionId);
});
test('published form projection retains a valid default option identity and rejects dangling defaults',()=>{
 const copy=structuredClone(stored),choice=newFormField('select','stay');choice.defaultOptionId='stay-option';copy.definition.fields.push(choice);
 assert.equal(projectPublicForm(copy,site,formId,'key').fields[1].defaultOptionId,'stay-option');
 choice.defaultOptionId='missing';assert.equal(projectPublicForm(copy,site,formId,'key'),null);
});
test('page-bound public forms reject revision or locale changes without substituting new fields',async()=>{
 const {parseExpectedPublicForm}=await import('../lib/cms/public-form.ts');const value=projectPublicForm(stored,site,formId,'key');
 assert.deepEqual(parseExpectedPublicForm(value,formId,{revisionId:site,locale:'en'}),value);
 assert.throws(()=>parseExpectedPublicForm({...value,revisionId:formId},formId,{revisionId:site,locale:'en'}));assert.throws(()=>parseExpectedPublicForm({...value,locale:'fr'},formId,{revisionId:site,locale:'en'}));assert.throws(()=>parseExpectedPublicForm(value,site));assert.deepEqual(parseExpectedPublicForm(value,formId),value);
});
