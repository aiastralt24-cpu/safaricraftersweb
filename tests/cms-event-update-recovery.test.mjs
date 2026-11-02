import test from 'node:test';import assert from 'node:assert/strict';
import {newEvent} from '../lib/cms/events.ts';import {reconcileEventUpdate} from '../lib/cms/event-update-recovery.ts';
const payload={...newEvent(),slug:'example'},base={id:'one',type:'event',path:'/events/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,category:'My edit'};
test('interrupted Event updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileEventUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileEventUpdate(base,mine,base).status,'retry');
 const result=reconcileEventUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,category:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.category,'My edit');assert.equal(result.conflict.remote.category,'Their edit');
});
test('interrupted Event recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/events/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,category:'Changed without revision'}}])assert.throws(()=>reconcileEventUpdate(base,mine,{...base,...patch}));
});
