import test from 'node:test';
import assert from 'node:assert/strict';
import {importSha256,readPendingDestinationImport,verifyDestinationImportReceipt,verifyDestinationImportReview} from '../lib/cms/destination-import-client.ts';
import {newDestination} from '../lib/cms/destinations.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const pending={site,requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),targets:[{sourceKey:'destination_import_'+'c'.repeat(64),recordId:record}]};
const response={requestKey:site,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{recordId:record,revisionId:revision,sourceKey:pending.targets[0].sourceKey}]};
test('client import hashing matches server source identity and recovery rejects altered receipts',async()=>{
 assert.equal(await importSha256(new TextEncoder().encode(JSON.stringify('forest'))),sourceDigest('forest'));
 assert.deepEqual(verifyDestinationImportReceipt(response,pending),response.result);
 for(const patch of [{requestKey:record},{sourceDigest:'d'.repeat(64)},{result:[]},{result:[{...response.result[0],recordId:site}]},{result:[...response.result,...response.result]}])assert.throws(()=>verifyDestinationImportReceipt({...response,...patch},pending));
});
test('client pending imports restore only bounded website-matching recovery metadata',()=>{
 assert.equal(readPendingDestinationImport(null,site),null);assert.deepEqual(readPendingDestinationImport(JSON.stringify(pending),site),pending);
 for(const value of ['invalid',JSON.stringify({...pending,site:record}),JSON.stringify({...pending,targets:[...pending.targets,...pending.targets]}),JSON.stringify({...pending,upload:'private content'})])assert.throws(()=>readPendingDestinationImport(value,site));
});
test('client review verifies original file identity and rejects inconsistent save eligibility',()=>{
 const source={hash:'a'.repeat(64),size:100,format:'xlsx'};
 const review={source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,mediaAndReferences:true},plan:{valid:true,issues:[],changes:[{importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/destinations/forest',payload:{...newDestination(),slug:'forest'},replacedCollections:[]}]}};
 assert.equal(verifyDestinationImportReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyDestinationImportReview(review,{...source,size:101}));assert.throws(()=>verifyDestinationImportReview({...review,verification:{currentRecords:true,mediaAndReferences:false}},source));assert.throws(()=>verifyDestinationImportReview({...review,plan:{...review.plan,valid:false}},source));
});
