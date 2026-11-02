import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyProductImportCancellation,importSha256,readPendingProductImport,verifyProductImportReceipt,verifyProductImportReview} from '../lib/cms/product-import-client.ts';
import {newProduct} from '../lib/cms/products.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const pending={version:1,actorId:record,site,requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),targets:[{sourceKey:'product_import_'+'c'.repeat(64),recordId:record}]};
const response={requestKey:site,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{recordId:record,revisionId:revision,sourceKey:pending.targets[0].sourceKey}]};
test('client import hashing matches server source identity and recovery rejects altered receipts',async()=>{
 assert.equal(await importSha256(new TextEncoder().encode(JSON.stringify('forest'))),sourceDigest('forest'));
 const cancelled={status:'cancelled',requestKey:pending.requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest};assert.equal(verifyProductImportCancellation(cancelled,pending).status,'cancelled');assert.throws(()=>verifyProductImportCancellation({...cancelled,sourceDigest:'d'.repeat(64)},pending));assert.throws(()=>verifyProductImportCancellation({...cancelled,result:[]},pending));
 assert.deepEqual(verifyProductImportReceipt(response,pending),response.result);
 for(const patch of [{requestKey:record},{sourceDigest:'d'.repeat(64)},{result:[]},{result:[{...response.result[0],recordId:site}]},{result:[...response.result,...response.result]}])assert.throws(()=>verifyProductImportReceipt({...response,...patch},pending));
});
test('client pending imports restore only bounded website-matching recovery metadata',()=>{
 assert.equal(readPendingProductImport(null,site,record),null);assert.deepEqual(readPendingProductImport(JSON.stringify(pending),site,record),pending);
 for(const value of ['invalid',JSON.stringify({...pending,site:record}),JSON.stringify({...pending,actorId:site}),JSON.stringify({...pending,targets:[...pending.targets,...pending.targets]}),JSON.stringify({...pending,upload:'private content'})])assert.throws(()=>readPendingProductImport(value,site,record));
});
test('client review verifies original file identity and rejects inconsistent save eligibility',()=>{
 const source={hash:'a'.repeat(64),size:100,format:'xlsx'};
 const review={comparisons:[{importId:'forest',revision:null,before:null}],source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,media:true,references:true,categories:true},plan:{valid:true,issues:[],changes:[{sourceRow:2,importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/products/forest',payload:{...newProduct(),slug:'forest'},replacedCollections:[]}]}};
 assert.equal(verifyProductImportReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyProductImportReview({...review,verification:{...review.verification,categories:false}},source));
 assert.throws(()=>verifyProductImportReview({...review,plan:{...review.plan,changes:[...review.plan.changes,...review.plan.changes]}},source));
 assert.throws(()=>verifyProductImportReview({...review,comparisons:[]},source));
 assert.throws(()=>verifyProductImportReview({...review,comparisons:[{...review.comparisons[0],revision}]},source));
 const updated={...review,comparisons:[{importId:record,revision,before:{...newProduct(),slug:'forest',title:'Previously saved'}}],plan:{...review.plan,changes:[{...review.plan.changes[0],importId:record,operation:'update',recordId:record,expectedRevision:revision}]}};
 assert.equal(verifyProductImportReview(updated,source).comparisons[0].before.title,'Previously saved');
 assert.throws(()=>verifyProductImportReview({...updated,comparisons:[{...updated.comparisons[0],revision:site}]},source));
 assert.throws(()=>verifyProductImportReview({...updated,comparisons:[{...updated.comparisons[0],before:null}]},source));
 assert.throws(()=>verifyProductImportReview(review,{...source,size:101}));assert.throws(()=>verifyProductImportReview({...review,verification:{currentRecords:true,media:false,references:true,categories:true}},source));assert.throws(()=>verifyProductImportReview({...review,plan:{...review.plan,valid:false}},source));
});

import {compareProductImport} from '../lib/cms/product-import-comparison.ts';
test('product comparison exposes removed variants, commerce mappings, specifications, media and private notes',()=>{
 const before={...newProduct(),internalNotes:'Old note',gallery:[{assetId:'image',alt:'Image',decorative:false}],specifications:[{attributeId:'width',region:null,value:{state:'known',value:0}}],variants:[{id:'small',title:'Small',code:'0001',size:'',colour:'',finish:'',packaging:'',specifications:[]}],commerce:{provider:'shopify',productId:'gid://shopify/Product/1',variants:[{variantKey:'small',variantId:'gid://shopify/ProductVariant/1'}]}};
 const after=newProduct();assert.deepEqual(compareProductImport(before,after).map(row=>row.field),['gallery','specifications','variants','commerce','internalNotes']);assert.deepEqual(compareProductImport(before,structuredClone(before)),[]);
});
