import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import inventory from '../docs/cms/contact-migration-inventory.json' with {type:'json'};
import {contactMigrationDependencies as proof} from '../lib/cms/contact-migration.ts';
import {planContactFormMigration} from '../lib/cms/contact-form-migration.ts';
import {formSchema,validateFormSubmission} from '../lib/cms/forms.ts';
import {initialFormAnswers} from '../lib/cms/form-visibility.ts';
test('contact and corporate proposals preserve field order, copy, placeholders, options and source defaults',()=>{
 const proposal=planContactFormMigration(proof);assert.equal(proposal.readyToApply,false);
 for(const [index,result]of proposal.forms.entries()){
  const source=inventory.routes[index].form,form=result.definition;assert.ok(formSchema.safeParse(form).success);assert.equal(form.submitLabel,source.submitLabel);assert.deepEqual(form.fields.map(f=>f.id),source.fields.map(f=>f.name));
  for(const [i,field]of form.fields.entries()){const old=source.fields[i];assert.equal(field.required,old.required);assert.equal(field.help,old.help??'');if(old.label)assert.equal(field.label,old.label);assert.equal(field.placeholder,old.placeholder??undefined);
   if('options'in field){assert.deepEqual(field.options.map(o=>o.label),old.options.map(o=>o.label));const mapping=result.optionMappings.find(m=>m.fieldId===field.id);assert.equal(mapping.options.find(o=>o.id===initialFormAnswers(form)[field.id]).legacyValue,old.defaultValue);}
  }
  const consent=form.fields.find(f=>f.type==='consent');assert.equal(consent.text,source.fields.find(f=>f.name==='consent').consentText);assert.equal(consent.purpose,'enquiry');assert.equal(initialFormAnswers(form).consent,undefined);assert.deepEqual(form.notificationRouteIds,[]);
 }
});
test('source-specific required message and exact consent survive validation without introducing marketing opt-in',()=>{
 const [contact,corporate]=planContactFormMigration(proof).forms;
 const answers={name:'Guest',email:'guest@example.com',phone:'+91 9876543210',consent:true};
 assert.equal(validateFormSubmission(contact.definition,answers).valid,false);assert.equal(validateFormSubmission(contact.definition,{...answers,message:'A private safari'}).valid,true);assert.equal(validateFormSubmission(corporate.definition,answers).valid,true);
 const received=validateFormSubmission(corporate.definition,answers);assert.equal(received.consents.length,1);assert.equal(received.consents[0].purpose,'enquiry');
 assert.equal(corporate.definition.fields.find(f=>f.id==='company').maxLength,160);assert.equal(corporate.definition.fields.find(f=>f.id==='message').maxLength,4000);
});
test('source proof, output isolation and unresolved differences prevent treating form proposals as completed migration',async()=>{
 assert.throws(()=>planContactFormMigration(proof.slice(1)));const result=planContactFormMigration(proof);const shared=await fs.readFile(new URL('../components/ContactForm.tsx',import.meta.url),'utf8');
 for(const form of result.forms){assert.ok(shared.includes(form.presentation.successHeading));assert.ok(shared.includes(form.presentation.successBody));assert.ok(form.findings.some(f=>f.code==='validation_review'));assert.ok(form.findings.some(f=>f.code==='notifications_unmapped'));}
 result.forms[0].definition.fields[0].label='Changed';assert.equal(planContactFormMigration(proof).forms[0].definition.fields[0].label,'Name');assert.ok(result.findings.some(f=>f.code==='intake_mapping_pending'));
});
