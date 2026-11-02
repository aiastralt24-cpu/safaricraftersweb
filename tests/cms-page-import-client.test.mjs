import test from 'node:test';
import assert from 'node:assert/strict';
import {importSha256,readPendingPageImport,verifyPageImportReceipt,verifyPageImportReview} from '../lib/cms/page-import-client.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const pending={version:1,actorId:record,site,requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),targets:[{sourceKey:'page_import_'+'c'.repeat(64),recordId:record}]};
const response={requestKey:site,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{recordId:record,revisionId:revision,sourceKey:pending.targets[0].sourceKey}]};
test('client import hashing matches server source identity and recovery rejects altered receipts',async()=>{
 assert.equal(await importSha256(new TextEncoder().encode(JSON.stringify('forest'))),sourceDigest('forest'));
 assert.deepEqual(verifyPageImportReceipt(response,pending),response.result);
 for(const patch of [{requestKey:record},{sourceDigest:'d'.repeat(64)},{result:[]},{result:[{...response.result[0],recordId:site}]},{result:[...response.result,...response.result]}])assert.throws(()=>verifyPageImportReceipt({...response,...patch},pending));
});
test('client pending imports restore only bounded website-matching recovery metadata',()=>{
 assert.equal(readPendingPageImport(null,site,record),null);assert.deepEqual(readPendingPageImport(JSON.stringify(pending),site,record),pending);
 for(const value of ['invalid',JSON.stringify({...pending,site:record}),JSON.stringify({...pending,actorId:site}),JSON.stringify({...pending,targets:[...pending.targets,...pending.targets]}),JSON.stringify({...pending,upload:'private content'})])assert.throws(()=>readPendingPageImport(value,site,record));
});
test('client review verifies original file identity and rejects inconsistent save eligibility',()=>{
 const source={hash:'a'.repeat(64),size:100,format:'xlsx'};
 const review={source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,media:true,documents:true},plan:{valid:true,issues:[],changes:[{importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/forest',title:'Forest',payload:{composition:{schemaVersion:1,title:'Forest',sections:[]},seo:newPageSeo()},replaceSections:false,comparison:{title:null,sections:[],seo:[]}}]}};
 assert.equal(verifyPageImportReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyPageImportReview(review,{...source,size:101}));assert.throws(()=>verifyPageImportReview({...review,verification:{currentRecords:true,media:false}},source));assert.throws(()=>verifyPageImportReview({...review,plan:{...review.plan,valid:false}},source));
});

test('page client rejects unsafe routes, changed titles and document evidence gaps',()=>{const source={hash:'a'.repeat(64),size:100,format:'xlsx'},change={importId:'forest',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/forest',title:'Forest',payload:{composition:{schemaVersion:1,title:'Forest',sections:[]},seo:newPageSeo()},replaceSections:false,comparison:{title:null,sections:[],seo:[]}},review={source:{sha256:source.hash,bytes:100,format:'xlsx'},reviewDigest:'b'.repeat(64),applyAvailable:true,verification:{currentRecords:true,media:true,documents:true},plan:{valid:true,issues:[],changes:[change]}};for(const patch of [{path:'/admin/forest'},{title:'Mismatch'},{locale:'fr'},{payload:{...change.payload,unknown:1}}])assert.throws(()=>verifyPageImportReview({...review,plan:{...review.plan,changes:[{...change,...patch}]}},source));assert.throws(()=>verifyPageImportReview({...review,verification:{...review.verification,documents:false}},source));});
