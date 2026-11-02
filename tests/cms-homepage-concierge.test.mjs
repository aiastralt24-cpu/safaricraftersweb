import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition} from '../lib/cms/composition.ts';
import {createHomepageConciergeSection} from '../lib/cms/section-drafts.ts';
const make=()=>({schemaVersion:1,title:'Homepage',sections:[createHomepageConciergeSection('concierge','india')]});
test('concierge preserves every source planning query plus a separate contact action',()=>{
 const value=make(),regions=['India','Africa','South & Central America','Arctic & Beyond','Surprise me'];
 value.sections[0].data.choices=regions.map((region,index)=>({id:`region-${index}`,link:{label:region,href:`/plan?region=${encodeURIComponent(region)}`,newWindow:false}}));
 const result=validateComposition(value);assert.equal(result.valid,true);
 const data=result.page.sections[0].data;assert.equal(data.choices.length,5);assert.equal(data.contact.href,'/contact');
 assert.deepEqual(data.choices.map(choice=>new URL(choice.link.href,'https://site.test').searchParams.get('region')),regions);
 assert.deepEqual(data.prompt,value.sections[0].data.prompt);
});
test('concierge rejects unsafe destinations, missing choices, excessive choices and duplicate identities',()=>{
 for(const href of ['javascript:alert(1)','//external.test','https://user:password@external.test','/plan?region=South & Central America']){const value=make();value.sections[0].data.choices[0].link.href=href;assert.equal(validateComposition(value).valid,false);}
 for(const count of [0,13]){const value=make(),choice=value.sections[0].data.choices[0];value.sections[0].data.choices=Array.from({length:count},(_,i)=>({...choice,id:`choice-${i}`}));assert.equal(validateComposition(value).valid,false);}
 const duplicate=make();duplicate.sections[0].data.choices.push(structuredClone(duplicate.sections[0].data.choices[0]));assert.equal(validateComposition(duplicate).valid,false);
});
