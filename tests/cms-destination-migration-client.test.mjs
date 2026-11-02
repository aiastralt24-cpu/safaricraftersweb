import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDestinationSnapshot,parseDestinationMappings,verifyDestinationReview,verifyMigrationReceipt} from '../lib/cms/destination-migration-client.ts';
const source=[{slug:'forest',title:'Forest'}],digest='a'.repeat(64);
const review={applyAvailable:true,reviewDigest:'b'.repeat(64),plan:{count:1,readyDrafts:1,unusedMappings:[],candidates:[{sourceIndex:0,sourceDigest:digest,canSaveDraft:true,source:source[0],payload:{title:'Forest'},issues:[]}]}};
test('destination migration client bounds snapshot batches and mapping objects',()=>{
 assert.deepEqual(parseDestinationSnapshot(JSON.stringify({destinations:source})),source);assert.deepEqual(parseDestinationSnapshot(JSON.stringify(source)),source);
 assert.throws(()=>parseDestinationSnapshot(JSON.stringify(Array.from({length:26},()=>source[0]))));assert.throws(()=>parseDestinationSnapshot('{}'));assert.throws(()=>parseDestinationSnapshot('x'.repeat(1_000_001)));
 assert.deepEqual(parseDestinationMappings('{}'),{});assert.throws(()=>parseDestinationMappings('[]'));assert.throws(()=>parseDestinationMappings('{broken'));assert.throws(()=>parseDestinationMappings(' '.repeat(500_001)));
});
test('destination review cannot substitute sources and receipts must cover every unique reviewed record',()=>{
 assert.equal(verifyDestinationReview(review,source).applyAvailable,true);
 assert.throws(()=>verifyDestinationReview(review,[{slug:'other',title:'Other'}]));assert.throws(()=>verifyDestinationReview({...review,plan:{...review.plan,candidates:[{...review.plan.candidates[0],sourceIndex:1}]}},source));
 const receipt={result:[{recordId:'10000000-0000-4000-8000-000000000001',revisionId:'20000000-0000-4000-8000-000000000001',sourceKey:`destination_${digest}`}]};
 assert.equal(verifyMigrationReceipt(receipt,[digest]).length,1);assert.throws(()=>verifyMigrationReceipt(receipt,['c'.repeat(64)]));assert.throws(()=>verifyMigrationReceipt({result:[...receipt.result,...receipt.result]},[digest,digest]));
});

test('pending migration recovery stores bounded identifiers and rejects cross-site or malformed state',async()=>{
 const {readPendingDestinationMigration}=await import('../lib/cms/destination-migration-client.ts');const site='10000000-0000-4000-8000-000000000001';
 const value={site,requestKey:'20000000-0000-4000-8000-000000000001',reviewDigest:digest,sourceDigests:[digest]};assert.deepEqual(readPendingDestinationMigration(JSON.stringify(value),site),value);assert.equal(readPendingDestinationMigration(null,site),null);
 assert.throws(()=>readPendingDestinationMigration(JSON.stringify(value),'30000000-0000-4000-8000-000000000001'));assert.throws(()=>readPendingDestinationMigration(JSON.stringify({...value,source:[{private:'content'}]}),site));assert.throws(()=>readPendingDestinationMigration('broken',site));
});
