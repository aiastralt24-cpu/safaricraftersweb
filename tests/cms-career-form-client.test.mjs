import test from 'node:test';import assert from 'node:assert/strict';
import {careerFormUrl,parseCareerFormResponse,careerSubmissionSelection} from '../lib/cms/career-form-client.ts';
import {newForm} from '../lib/cms/form-drafts.ts';import {projectPublicForm} from '../lib/cms/public-form.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,options={recordId:id(1),revisionId:id(2),slug:'advisor',formRevisionId:id(3)},formId=id(4);
const form=projectPublicForm({websiteId:id(5),formId,revisionId:id(3),locale:'en',definition:newForm('name')},id(5),formId,'public-challenge');
const career={recordId:id(1),revisionId:id(2),slug:'advisor'};
test('career form client binds request URL, returned job/form revisions and current source path',()=>{
 const url=new URL(careerFormUrl(formId,options),'https://example.test');assert.equal(url.pathname,`/api/cms/careers/${id(1)}/application`);assert.equal(url.searchParams.get('formRevision'),id(3));assert.deepEqual(parseCareerFormResponse({form,career},formId,options),form);assert.deepEqual(careerSubmissionSelection(options,'/careers/advisor'),career);
 for(const response of [{form,career:{...career,recordId:id(9)}},{form,career:{...career,revisionId:id(9)}},{form,career:{...career,slug:'other'}},{form:{...form,revisionId:id(9)},career},{form:{...form,locale:'fr'},career},{form,career,private:'data'}])assert.throws(()=>parseCareerFormResponse(response,formId,options));
 assert.throws(()=>careerSubmissionSelection(options,'/contact'));assert.throws(()=>careerFormUrl('invalid',options));assert.throws(()=>careerSubmissionSelection({...options,title:'Forged'},'/careers/advisor'));
});
