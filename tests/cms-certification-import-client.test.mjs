import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCertificationImportCancellation,importSha256,readPendingCertificationImport,verifyCertificationImportReceipt,verifyCertificationImportReview} from '../lib/cms/certification-import-client.ts';
import {newCertification} from '../lib/cms/certifications.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const pending={version:1,actorId:record,site,requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),targets:[{sourceKey:'certification_import_'+'c'.repeat(64),recordId:record}]};
const response={requestKey:site,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{recordId:record,revisionId:revision,sourceKey:pending.targets[0].sourceKey}]};
test('client import hashing matches server source identity and recovery rejects altered receipts',async()=>{
 assert.equal(await importSha256(new TextEncoder().encode(JSON.stringify('forest'))),sourceDigest('forest'));
 const cancelled={status:'cancelled',requestKey:pending.requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest};assert.equal(verifyCertificationImportCancellation(cancelled,pending).status,'cancelled');assert.throws(()=>verifyCertificationImportCancellation({...cancelled,sourceDigest:'d'.repeat(64)},pending));assert.throws(()=>verifyCertificationImportCancellation({...cancelled,result:[]},pending));
 assert.deepEqual(verifyCertificationImportReceipt(response,pending),response.result);
 for(const patch of [{requestKey:record},{sourceDigest:'d'.repeat(64)},{result:[]},{result:[{...response.result[0],recordId:site}]},{result:[...response.result,...response.result]}])assert.throws(()=>verifyCertificationImportReceipt({...response,...patch},pending));
});
test('client pending imports restore only bounded website-matching recovery metadata',()=>{
 assert.equal(readPendingCertificationImport(null,site,record),null);assert.deepEqual(readPendingCertificationImport(JSON.stringify(pending),site,record),pending);
 for(const value of ['invalid',JSON.stringify({...pending,site:record}),JSON.stringify({...pending,actorId:site}),JSON.stringify({...pending,targets:[...pending.targets,...pending.targets]}),JSON.stringify({...pending,upload:'private content'})])assert.throws(()=>readPendingCertificationImport(value,site,record));
});
test('certification recovery rejects duplicate update targets, foreign families and oversized or incomplete trackers',()=>{
 const invalid=[
  {...pending,targets:[...pending.targets,{sourceKey:'certification_import_'+'d'.repeat(64),recordId:record}]},
  {...pending,targets:[{sourceKey:'location_import_'+'c'.repeat(64),recordId:record}]},
  {...pending,targets:[]}, {...pending,version:2}, {...pending,requestKey:null},
 ];
 for(const value of invalid)assert.throws(()=>readPendingCertificationImport(JSON.stringify(value),site,record));
 assert.throws(()=>readPendingCertificationImport(' '.repeat(20_001),site,record));
 const creates={...pending,targets:[{sourceKey:'certification_import_'+'c'.repeat(64),recordId:null},{sourceKey:'certification_import_'+'d'.repeat(64),recordId:null}]};
 assert.deepEqual(readPendingCertificationImport(JSON.stringify(creates),site,record),creates);
 const saved={...response,result:[response.result[0],{recordId:site,revisionId:revision,sourceKey:creates.targets[1].sourceKey}]};
 assert.deepEqual(verifyCertificationImportReceipt(saved,creates),saved.result);
 assert.throws(()=>verifyCertificationImportReceipt({...saved,result:[...saved.result].map(row=>({...row,recordId:record}))},creates));
 assert.throws(()=>verifyCertificationImportReceipt({...saved,reviewDigest:'e'.repeat(64)},creates));
});
test('client review verifies original file identity and rejects inconsistent save eligibility',()=>{
 const source={hash:'a'.repeat(64),size:100,format:'xlsx'};
 const review={comparisons:[{importId:'forest',revision:null,before:null}],source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,media:true,references:true},plan:{valid:true,issues:[],changes:[{importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/certifications/forest',payload:{...newCertification(),slug:'forest'},replacedCollections:[]}]}};
 assert.equal(verifyCertificationImportReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyCertificationImportReview({...review,comparisons:[]},source));
 assert.throws(()=>verifyCertificationImportReview({...review,comparisons:[{...review.comparisons[0],revision}]},source));
 const updated={...review,comparisons:[{importId:record,revision,before:{...newCertification(),slug:'forest',title:'Previously saved'}}],plan:{...review.plan,changes:[{...review.plan.changes[0],importId:record,operation:'update',recordId:record,expectedRevision:revision}]}};
 assert.equal(verifyCertificationImportReview(updated,source).comparisons[0].before.title,'Previously saved');
 const changedApplication=structuredClone(updated);changedApplication.plan.changes[0].payload.evidence=[{recordId:site}];assert.equal(verifyCertificationImportReview(changedApplication,source).plan.changes[0].payload.evidence[0].recordId,site);
 assert.throws(()=>verifyCertificationImportReview({...updated,comparisons:[{...updated.comparisons[0],revision:site}]},source));
 assert.throws(()=>verifyCertificationImportReview({...updated,comparisons:[{...updated.comparisons[0],before:null}]},source));
 assert.throws(()=>verifyCertificationImportReview(review,{...source,size:101}));assert.throws(()=>verifyCertificationImportReview({...review,verification:{currentRecords:true,media:false,references:true}},source));assert.throws(()=>verifyCertificationImportReview({...review,plan:{...review.plan,valid:false}},source));
});
