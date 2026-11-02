import test from 'node:test';import assert from 'node:assert/strict';
import {newCareer} from '../lib/cms/careers.ts';import {reconcileCareerUpdate} from '../lib/cms/career-update-recovery.ts';
const payload={...newCareer(),slug:'example'},base={id:'one',type:'career',path:'/careers/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Career updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileCareerUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileCareerUpdate(base,mine,base).status,'retry');
 const result=reconcileCareerUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Career recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/career/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileCareerUpdate(base,mine,{...base,...patch}));
});

