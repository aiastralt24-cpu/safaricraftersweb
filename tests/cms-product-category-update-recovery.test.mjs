import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';import {reconcileProductCategoryUpdate} from '../lib/cms/product-category-update-recovery.ts';
const payload={...newProductCategory(),slug:'example'},base={id:'one',type:'productCategory',path:'/product-categories/example',locale:'en',currentRevision:'before',payload,permissions:{edit:true}},mine={...payload,summary:'My edit'};
test('interrupted ProductCategory updates distinguish matching content, explicit retry and concurrent edits',()=>{
 assert.equal(reconcileProductCategoryUpdate(base,mine,{...base,currentRevision:'after',payload:mine}).status,'matching');
 assert.equal(reconcileProductCategoryUpdate(base,mine,base).status,'retry');
 const result=reconcileProductCategoryUpdate(base,mine,{...base,currentRevision:'after',payload:{...payload,summary:'Their edit'}});assert.equal(result.status,'compare');assert.equal(result.conflict.mine.summary,'My edit');assert.equal(result.conflict.remote.summary,'Their edit');
});
test('interrupted ProductCategory recovery rejects identity, access, route and inconsistent revision changes',()=>{
 for(const patch of [{id:'other'},{type:'page'},{locale:'fr'},{path:'/partner/other'},{permissions:{edit:false}},{payload:{...payload,slug:'other'}},{payload:{...payload,summary:'Changed without revision'}}])assert.throws(()=>reconcileProductCategoryUpdate(base,mine,{...base,...patch}));
});

