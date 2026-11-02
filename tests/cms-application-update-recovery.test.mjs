import test from 'node:test';import assert from 'node:assert/strict';
import {newApplication} from '../lib/cms/applications.ts';import {reconcileApplicationUpdate} from '../lib/cms/application-update-recovery.ts';
const payload={...newApplication(),slug:'example'},base={id:'one',type:'application',path:'/applications/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Application updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileApplicationUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileApplicationUpdate(base,mine,base).status,'retry');
 const result=reconcileApplicationUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Application recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/application/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileApplicationUpdate(base,mine,{...base,...patch}));
});

test('industry recovery preserves classification and route',()=>{const industry={...payload,kind:'industry'},record={...base,path:'/industries/example',payload:industry};assert.equal(reconcileApplicationUpdate(record,{...industry,summary:'Mine'},record).status,'retry');assert.throws(()=>reconcileApplicationUpdate(record,payload,record));assert.throws(()=>reconcileApplicationUpdate(record,industry,{...record,currentRevision:'new',payload}));});
