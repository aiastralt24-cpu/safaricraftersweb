import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';import {reconcileLeadershipUpdate} from '../lib/cms/leadership-update-recovery.ts';
const payload={...newLeadership(),slug:'example'},base={id:'one',type:'leadership',path:'/leadership/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,department:'My edit'};
test('interrupted Leadership updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileLeadershipUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileLeadershipUpdate(base,mine,base).status,'retry');
 const result=reconcileLeadershipUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,department:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.department,'My edit');assert.equal(result.conflict.remote.department,'Their edit');
});
test('interrupted Leadership recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/leadership/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,department:'Changed without revision'}}])assert.throws(()=>reconcileLeadershipUpdate(base,mine,{...base,...patch}));
});
