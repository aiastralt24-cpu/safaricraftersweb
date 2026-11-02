import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';import {reconcileNewsUpdate} from '../lib/cms/news-update-recovery.ts';
const payload={...newNews(),slug:'example'},base={id:'one',type:'news',path:'/news/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,topic:'My edit'};
test('interrupted News updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileNewsUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileNewsUpdate(base,mine,base).status,'retry');
 const result=reconcileNewsUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,topic:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.topic,'My edit');assert.equal(result.conflict.remote.topic,'Their edit');
});
test('interrupted News recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/news/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,topic:'Changed without revision'}}])assert.throws(()=>reconcileNewsUpdate(base,mine,{...base,...patch}));
});
