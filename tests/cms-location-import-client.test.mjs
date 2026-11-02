import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLocationImportCancellation,importSha256,readPendingLocationImport,verifyLocationImportReceipt,verifyLocationImportReview} from '../lib/cms/location-import-client.ts';
import {newLocation} from '../lib/cms/locations.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const pending={version:1,actorId:record,site,requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),targets:[{sourceKey:'location_import_'+'c'.repeat(64),recordId:record}]};
const response={requestKey:site,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{recordId:record,revisionId:revision,sourceKey:pending.targets[0].sourceKey}]};
test('client import hashing matches server source identity and recovery rejects altered receipts',async()=>{
 assert.equal(await importSha256(new TextEncoder().encode(JSON.stringify('forest'))),sourceDigest('forest'));
 const cancelled={status:'cancelled',requestKey:pending.requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest};assert.equal(verifyLocationImportCancellation(cancelled,pending).status,'cancelled');assert.throws(()=>verifyLocationImportCancellation({...cancelled,sourceDigest:'d'.repeat(64)},pending));assert.throws(()=>verifyLocationImportCancellation({...cancelled,result:[]},pending));
 assert.deepEqual(verifyLocationImportReceipt(response,pending),response.result);
 for(const patch of [{requestKey:record},{sourceDigest:'d'.repeat(64)},{result:[]},{result:[{...response.result[0],recordId:site}]},{result:[...response.result,...response.result]}])assert.throws(()=>verifyLocationImportReceipt({...response,...patch},pending));
});
test('client pending imports restore only bounded website-matching recovery metadata',()=>{
 assert.equal(readPendingLocationImport(null,site,record),null);assert.deepEqual(readPendingLocationImport(JSON.stringify(pending),site,record),pending);
 for(const value of ['invalid',JSON.stringify({...pending,site:record}),JSON.stringify({...pending,actorId:site}),JSON.stringify({...pending,targets:[...pending.targets,...pending.targets]}),JSON.stringify({...pending,upload:'private content'})])assert.throws(()=>readPendingLocationImport(value,site,record));
});
test('client review verifies original file identity and rejects inconsistent save eligibility',()=>{
 const source={hash:'a'.repeat(64),size:100,format:'xlsx'};
 const review={comparisons:[{importId:'forest',revision:null,before:null}],source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,media:true,references:true},plan:{valid:true,issues:[],changes:[{importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/locations/forest',payload:{...newLocation(),slug:'forest'},replacedCollections:[]}]}};
 assert.equal(verifyLocationImportReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyLocationImportReview({...review,comparisons:[]},source));
 assert.throws(()=>verifyLocationImportReview({...review,comparisons:[{...review.comparisons[0],revision}]},source));
 const updated={...review,comparisons:[{importId:record,revision,before:{...newLocation(),slug:'forest',title:'Previously saved'}}],plan:{...review.plan,changes:[{...review.plan.changes[0],importId:record,operation:'update',recordId:record,expectedRevision:revision}]}};
 assert.equal(verifyLocationImportReview(updated,source).comparisons[0].before.title,'Previously saved');
 const changedKind=structuredClone(updated);changedKind.plan.changes[0].payload.kind='showroom';assert.equal(verifyLocationImportReview(changedKind,source).plan.changes[0].payload.kind,'showroom');
 assert.throws(()=>verifyLocationImportReview({...updated,comparisons:[{...updated.comparisons[0],revision:site}]},source));
 assert.throws(()=>verifyLocationImportReview({...updated,comparisons:[{...updated.comparisons[0],before:null}]},source));
 assert.throws(()=>verifyLocationImportReview(review,{...source,size:101}));assert.throws(()=>verifyLocationImportReview({...review,verification:{currentRecords:true,media:false,references:true}},source));assert.throws(()=>verifyLocationImportReview({...review,plan:{...review.plan,valid:false}},source));
});
