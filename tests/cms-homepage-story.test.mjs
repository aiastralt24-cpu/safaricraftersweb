import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition,editComposition} from '../lib/cms/composition.ts';
import {createHomepageStorySection} from '../lib/cms/section-drafts.ts';
const make=()=>({schemaVersion:1,title:'Homepage',sections:[createHomepageStorySection('story','years')]});
test('homepage story preserves grouped heading, numeric figures, suffixes, evidence and order',()=>{
 const value=make(),data=value.sections[0].data;
 data.statistics=[{id:'years',value:75,suffix:'+',label:'Years of combined expertise',source:'Awaiting client confirmation'},{id:'guests',value:6000,suffix:'+',label:'Guests hosted',source:''}];
 data.heading={lines:[{runs:[{text:'Informed by ',emphasis:false},{text:'intention,',emphasis:true}]},{runs:[{text:'guided by ',emphasis:false},{text:'experience.',emphasis:true}]}]};
 const result=validateComposition(value);assert.equal(result.valid,true);assert.deepEqual(result.page.sections[0].data,data);
 const duplicate=editComposition(value,{type:'duplicate',id:'story',newId:'story-copy'});assert.equal(duplicate.sections[1].controls.visible,false);assert.deepEqual(duplicate.sections[1].data.statistics.map(s=>s.value),[75,6000]);
});
test('invalid claim figures, unsafe links and duplicate statistic identities block composition saves',()=>{
 for(const number of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'75']){const value=make();value.sections[0].data.statistics[0].value=number;assert.equal(validateComposition(value).valid,false);}
 const value=make();value.sections[0].data.statistics.push({...value.sections[0].data.statistics[0]});assert.equal(validateComposition(value).valid,false);
 const unsafe=make();unsafe.sections[0].data.button.href='javascript:alert(1)';assert.equal(validateComposition(unsafe).valid,false);
});
