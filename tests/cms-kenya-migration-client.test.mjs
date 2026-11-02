import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/kenya-source-inventory.json' with {type:'json'};
import {handleKenyaMigrationReview} from '../lib/cms/kenya-migration-api.ts';
import {verifyKenyaReview,makePendingKenyaMigration,readPendingKenyaMigration,kenyaRecoveryKey,kenyaApplyCommand,verifyKenyaReceipt,verifyKenyaRecovery} from '../lib/cms/kenya-migration-client.ts';
const site='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const selection={site,recordId:null,expectedRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`selected-${i}`}))};
async function review(){return (await handleKenyaMigrationReview(new Request('https://site.test/api/cms/migrations/kenya',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'review',...selection})}),async(_,name,args)=>name==='can'?true:args.p_bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true})))).json();}
test('Kenya client accepts the exact reviewed proposal and refuses invented content or scope',async()=>{
 const value=await review();assert.equal((await verifyKenyaReview(value,selection)).applyAvailable,true);
 for(const mutate of [v=>v.selection.site=other,v=>v.proposal.composition.title='Changed',v=>v.metadata.title='Changed',v=>v.before={},v=>v.applyAvailable=false,v=>v.reviewDigest='0'.repeat(64),v=>v.verification.verified=false,v=>v.verification.evidence.reverse(),v=>v.verification.evidence[0].revision=2,v=>v.verification.evidence[0].sourceMatches=false,v=>v.verification.unavailable.push('selected-0')]){const bad=structuredClone(value);mutate(bad);await assert.rejects(verifyKenyaReview(bad,selection));}
 await assert.rejects(verifyKenyaReview(value,{...selection,site:other}));
});

test('Kenya pending requests bind account/site and retain only exact recovery inputs',async()=>{
 const value=await review(),pending=await makePendingKenyaMigration(other,selection,value,other),text=JSON.stringify(pending);
 assert.deepEqual(readPendingKenyaMigration(text,site,other),pending);assert.equal(readPendingKenyaMigration(null,site,other),null);assert.ok(kenyaRecoveryKey(site,other).includes(site));assert.doesNotMatch(text,/composition|Bearer|proposal/);
 assert.throws(()=>readPendingKenyaMigration(text,other,other));assert.throws(()=>readPendingKenyaMigration(text,site,site));assert.throws(()=>readPendingKenyaMigration(' '.repeat(20001),site,other));
 const command=kenyaApplyCommand(pending);assert.equal(command.action,'apply');assert.equal(command.site,site);assert.deepEqual(command.evidence,value.verification.evidence);
 const receipt={requestKey:other,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:{recordId:site,revisionId:other},replayed:true};assert.deepEqual(verifyKenyaReceipt(receipt,pending),receipt.result);
 assert.equal(verifyKenyaRecovery({status:'unconfirmed',message:'Pending'},pending),null);
 assert.deepEqual(verifyKenyaRecovery({status:'complete',requestKey:other,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:receipt.result,createdAt:'2026-10-28T00:00:00Z'},pending),receipt.result);
 for(const patch of [{requestKey:site},{reviewDigest:'0'.repeat(64)},{sourceDigest:'0'.repeat(64)}])assert.throws(()=>verifyKenyaReceipt({...receipt,...patch},pending));
});
