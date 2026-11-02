import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
import {handleJournalMigrationReview} from '../lib/cms/journal-migration-api.ts';
import {parseJournalSnapshot,parseJournalMappings,journalSourceDigest,verifyJournalReview,verifyJournalReceipt,readPendingJournalMigration,verifyJournalRecovery,journalRecoveryKey,journalImageMapping} from '../lib/cms/journal-migration-client.ts';
const site='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000001',requestKey='30000000-0000-4000-8000-000000000001';
const source={slug:'forest',title:'Forest',category:'Wildlife',author:'Guide',date:'October 22, 2026',readTime:'',description:'Forest',quote:'',body:['Article'],image:{src:'/forest.jpg',alt:'Forest',credit:'Archive'},gallery:[]};
const hash=sourceDigest(source),mappings={[`snapshot:${hash}`]:{images:{image:{assetId:'forest',alt:'Forest',credit:'Archive',decorative:false}}}};
async function review(available=true){const request=new Request('https://site.test/api/cms/migrations/journal',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'review',site,locale:'en',source:[source],mappings})});return (await handleJournalMigrationReview(request,async()=>[{assetId:'forest',available}])).json();}
const result=[{recordId:'40000000-0000-4000-8000-000000000001',revisionId:'50000000-0000-4000-8000-000000000001',sourceKey:`journal_${hash}`}];
const pending={version:1,site,actorId,requestKey,sourceDigest:sourceDigest([source]),reviewDigest:'b'.repeat(64),sourceDigests:[hash]};
test('journal browser digest matches server hashing including reordered keys, Unicode and nested arrays',async()=>{
 for(const value of [source,[source],{z:[null,false,42,'é 🐅'],A:{b:2,a:1},a:'text'},{}])assert.equal(await journalSourceDigest(value),sourceDigest(value));
 assert.equal(await journalSourceDigest({b:2,a:1}),await journalSourceDigest({a:1,b:2}));
});
test('journal source and mappings parsing bounds uploads and accepts the actual site export shape',()=>{
 assert.deepEqual(parseJournalSnapshot(JSON.stringify({journal:[source],other:'ignored'})),[source]);assert.deepEqual(parseJournalSnapshot(JSON.stringify([source])),[source]);
 for(const input of ['{}','[]','broken',JSON.stringify(Array(26).fill(source)),'é'.repeat(500001)])assert.throws(()=>parseJournalSnapshot(input));
 assert.deepEqual(parseJournalMappings(JSON.stringify(mappings)),mappings);for(const input of ['[]','broken',' '.repeat(500001),JSON.stringify({bad:{images:{},extra:true}})])assert.throws(()=>parseJournalMappings(input));
});
test('journal client verifies actual API reviews and rejects substituted source, mappings and inconsistent readiness',async()=>{
 const value=await review();assert.equal((await verifyJournalReview(value,[source],mappings)).applyAvailable,true);
 assert.equal((await verifyJournalReview(await review(false),[source],mappings)).applyAvailable,false);
 await assert.rejects(verifyJournalReview(value,[{...source,title:'Changed'}],mappings));
 await assert.rejects(verifyJournalReview(value,[source],{}));
 for(const mutate of [v=>v.plan.sourceDigest='c'.repeat(64),v=>v.plan.candidates[0].sourceIndex=1,v=>v.plan.candidates[0].sourceKey='wrong',v=>v.plan.candidates[0].source.body=['Changed'],v=>v.plan.candidates[0].mappings.images.image.credit='Changed',v=>v.plan.readyDrafts=0,v=>v.plan.candidates[0].payload.body=[{kind:'unsupported'}],v=>v.plan.candidates[0].issues.push({field:'body',severity:'error',message:'Invalid'}),v=>v.applyAvailable=false]){const changed=structuredClone(value);mutate(changed);await assert.rejects(verifyJournalReview(changed,[source],mappings));}
});
test('journal receipts cover unique article identities and reject duplicate or substituted results',()=>{
 assert.deepEqual(verifyJournalReceipt({result},[hash]),result);
 for(const [value,hashes] of [[{result},['a'.repeat(64)]],[{result:[]},[hash]],[{result:[...result,...result]},[hash,hash]],[{result:[result[0],{...result[0],sourceKey:`journal_${'a'.repeat(64)}`}]},[hash,'a'.repeat(64)]]])assert.throws(()=>verifyJournalReceipt(value,hashes));
});
test('journal recovery persists only bounded identifiers scoped to account and site',()=>{
 assert.deepEqual(readPendingJournalMigration(JSON.stringify(pending),site,actorId),pending);assert.equal(readPendingJournalMigration(null,site,actorId),null);
 assert.notEqual(journalRecoveryKey(site,actorId),journalRecoveryKey(site,requestKey));
 for(const value of [{...pending,source:[source]},{...pending,sourceDigests:[hash,hash]},{...pending,version:2}])assert.throws(()=>readPendingJournalMigration(JSON.stringify(value),site,actorId));
 assert.throws(()=>readPendingJournalMigration(JSON.stringify(pending),requestKey,actorId));assert.throws(()=>readPendingJournalMigration(JSON.stringify(pending),site,requestKey));assert.throws(()=>readPendingJournalMigration('x'.repeat(10001),site,actorId));
});
test('journal status recovery never treats unknown or mismatched receipts as successful',()=>{
 const receipt={status:'complete',requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,createdAt:'2026-10-22T00:00:00Z',result};
 assert.deepEqual(verifyJournalRecovery(receipt,pending),result);assert.equal(verifyJournalRecovery({status:'unconfirmed',message:'Still unknown'},pending),null);
 for(const patch of [{status:'failed'},{requestKey:site},{sourceDigest:'a'.repeat(64)},{reviewDigest:'c'.repeat(64)},{result:[]},{createdAt:'yesterday'}])assert.throws(()=>verifyJournalRecovery({...receipt,...patch},pending));
});
test('journal asset selection preserves exact legacy alt text and credit and refuses unsupported metadata',()=>{
 assert.deepEqual(journalImageMapping(source.image,'forest'),mappings[`snapshot:${hash}`].images.image);
 assert.throws(()=>journalImageMapping({...source.image,crop:'custom'},'forest'));assert.throws(()=>journalImageMapping(source.image,''));
});
