import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';import {reconcilePartnerUpdate} from '../lib/cms/partner-update-recovery.ts';
const payload={...newPartner(),slug:'example'},base={id:'one',type:'partner',path:'/partners/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Partner updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcilePartnerUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcilePartnerUpdate(base,mine,base).status,'retry');
 const result=reconcilePartnerUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Partner recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/partner/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcilePartnerUpdate(base,mine,{...base,...patch}));
});

