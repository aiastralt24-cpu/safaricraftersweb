import test from 'node:test';import assert from 'node:assert/strict';
import {newProduct} from '../lib/cms/products.ts';import {reconcileProductUpdate} from '../lib/cms/product-update-recovery.ts';
const payload={...newProduct(),slug:'example'},base={id:'one',type:'product',path:'/products/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted Product updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileProductUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileProductUpdate(base,mine,base).status,'retry');
 const result=reconcileProductUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted Product recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/partner/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileProductUpdate(base,mine,{...base,...patch}));
});


test('product specification conflicts require an explicit grouped choice and preserve the latest category pin',async()=>{
 const {resolveDraftConflict}=await import('../lib/cms/draft-conflict.ts');
 const spec=value=>[{attributeId:'diameter',region:null,value:{state:'known',value}}];
 const original={...payload,specifications:spec(0)},local={...original,specifications:spec(1)},remote={...original,specifications:spec(2),category:{recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002'}};
 const result=reconcileProductUpdate({...base,payload:original},local,{...base,currentRevision:'after',payload:remote});assert.equal(result.status,'compare');assert.throws(()=>resolveDraftConflict(result.conflict.base,result.conflict.mine,result.conflict.remote,{}),/specifications/);
 const resolved=resolveDraftConflict(result.conflict.base,result.conflict.mine,result.conflict.remote,{specifications:'mine'});assert.deepEqual(resolved.specifications,spec(1));assert.deepEqual(resolved.category,remote.category);assert.deepEqual(remote.specifications,spec(2));
});
