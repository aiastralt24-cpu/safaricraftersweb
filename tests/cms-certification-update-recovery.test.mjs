import test from 'node:test';import assert from 'node:assert/strict';
import {newCertification} from '../lib/cms/certifications.ts';import {reconcileCertificationUpdate} from '../lib/cms/certification-update-recovery.ts';
const payload={...newCertification(),slug:'example'},base={id:'one',type:'certification',path:'/certifications/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Certification updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileCertificationUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileCertificationUpdate(base,mine,base).status,'retry');
 const result=reconcileCertificationUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Certification recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/certification/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileCertificationUpdate(base,mine,{...base,...patch}));
});

