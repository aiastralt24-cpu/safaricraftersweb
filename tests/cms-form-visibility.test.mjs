import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleFormState} from '../lib/cms/form-visibility.ts';
import {newForm,newFormField} from '../lib/cms/form-drafts.ts';
import {formSchema,validateFormSubmission} from '../lib/cms/forms.ts';
test('changing an upstream choice removes hidden descendant answers and required checks',()=>{
 const form=newForm('name');const parent=newFormField('select','interest'),child=newFormField('select','detail'),grandchild=newFormField('message','message');
 child.showWhen={fieldId:'interest',optionId:'interest-option'};grandchild.showWhen={fieldId:'detail',optionId:'detail-option'};grandchild.required=true;form.fields.push(parent,child,grandchild);assert.ok(formSchema.safeParse(form).success);
 const answers={name:'Guest',interest:'interest-option',detail:'detail-option',message:'Private request'};
 assert.equal(visibleFormState(form,answers).fields.length,4);
 const hidden=visibleFormState(form,{...answers,interest:''});assert.deepEqual(hidden.answers,{name:'Guest',interest:''});assert.equal(hidden.fields.length,2);assert.equal(validateFormSubmission(form,hidden.answers).valid,true);
 const reshown=visibleFormState(form,{...hidden.answers,interest:'interest-option',detail:'detail-option'});assert.equal(reshown.answers.message,undefined);assert.equal(validateFormSubmission(form,reshown.answers).valid,false);
});
test('visible state strips unknown answers without mutating the supplied values',()=>{
 const form=newForm('name'),answers={name:'Guest',unknown:'ignored'};assert.deepEqual(visibleFormState(form,answers).answers,{name:'Guest'});assert.equal(answers.unknown,'ignored');
});

test('default choices initialize visible branches, preserve clearing and reset newly revealed branches without restoring private answers',async()=>{
 const {initialFormAnswers,changeFormAnswer}=await import('../lib/cms/form-visibility.ts');
 const form=newForm('name'),parent=newFormField('select','interest'),child=newFormField('select','detail'),grandchild=newFormField('message','message');
 parent.defaultOptionId='interest-option';child.defaultOptionId='detail-option';child.showWhen={fieldId:'interest',optionId:'interest-option'};grandchild.showWhen={fieldId:'detail',optionId:'detail-option'};form.fields.push(parent,child,grandchild);
 assert.ok(formSchema.safeParse(form).success);let answers=initialFormAnswers(form);assert.deepEqual(answers,{interest:'interest-option',detail:'detail-option'});
 answers=changeFormAnswer(form,answers,'message','Private text');answers=changeFormAnswer(form,answers,'detail','');assert.deepEqual(answers,{interest:'interest-option',detail:''});
 answers=changeFormAnswer(form,answers,'name','Guest');assert.equal(answers.detail,'');assert.equal(answers.message,undefined);
 answers=changeFormAnswer(form,answers,'interest','');assert.deepEqual(answers,{name:'Guest',interest:''});
 answers=changeFormAnswer(form,answers,'interest','interest-option');assert.equal(answers.detail,'detail-option');assert.equal(answers.message,undefined);
 assert.deepEqual(initialFormAnswers(form),{interest:'interest-option',detail:'detail-option'});
});
