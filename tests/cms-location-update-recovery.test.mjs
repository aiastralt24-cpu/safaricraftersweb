import test from 'node:test';import assert from 'node:assert/strict';
import {newLocation} from '../lib/cms/locations.ts';import {reconcileLocationUpdate} from '../lib/cms/location-update-recovery.ts';
const payload={...newLocation(),slug:'example'},base={id:'one',type:'location',path:'/locations/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Location updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileLocationUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileLocationUpdate(base,mine,base).status,'retry');
 const result=reconcileLocationUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Location recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/location/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileLocationUpdate(base,mine,{...base,...patch}));
});

