import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
import {handleAboutMigrationReview} from '../lib/cms/about-migration-api.ts';
import {verifyAboutReview,makePendingAboutMigration,readPendingAboutMigration,aboutRecoveryKey,verifyAboutReceipt,verifyAboutRecovery,aboutApplyCommand} from '../lib/cms/about-migration-client.ts';
const site='00000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000001',key='20000000-0000-4000-8000-000000000001';
const selection={recordId:null,expectedRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`asset-${i}`}))};
async function review(){const request=new Request('http://localhost/api/cms/migrations/about',{method:'POST',headers:{authorization:'Bearer test.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',site,...selection})});return (await handleAboutMigrationReview(request,async(_token,name,args)=>name==='can'?true:args.p_bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true})))).json();}
test('browser review verification binds proposal, target, source and evidence to server digests',async()=>{
 const input=await review();assert.equal((await verifyAboutReview(input,site,selection)).applyAvailable,true);
 for(const change of [v=>v.proposal.composition.title='Tampered',v=>v.reviewDigest='0'.repeat(64),v=>v.sourceDigest='0'.repeat(64),v=>v.applyAvailable=false,v=>v.verification.unavailable=['asset-0'],v=>v.verification.evidence.reverse(),v=>v.before={unexpected:'draft'}]){const bad=structuredClone(input);change(bad);await assert.rejects(verifyAboutReview(bad,site,selection));}
 await assert.rejects(verifyAboutReview(input,site,{...selection,bindings:[...selection.bindings].reverse()}));
});
test('recovery persists bounded identities and evidence, never content or credentials, and reconstructs the exact apply command',async()=>{
 const checked=await verifyAboutReview(await review(),site,selection),pending=makePendingAboutMigration(site,actor,selection,checked,key),stored=JSON.stringify(pending);
 assert.doesNotMatch(stored,/Founded|composition|Bearer|proposal|before|biography/);
 assert.deepEqual(readPendingAboutMigration(stored,site,actor),pending);assert.match(aboutRecoveryKey(site,actor),new RegExp(actor));assert.equal(readPendingAboutMigration(null,site,actor),null);
 assert.throws(()=>readPendingAboutMigration(stored,site,key));assert.throws(()=>readPendingAboutMigration(' '.repeat(20001),site,actor));assert.throws(()=>readPendingAboutMigration(JSON.stringify({...pending,proposal:{}}),site,actor));
 const command=aboutApplyCommand(pending);assert.equal(command.requestKey,key);assert.deepEqual(command.evidence,checked.verification.evidence);assert.deepEqual(command.bindings,selection.bindings);assert.equal(command.reviewDigest,checked.reviewDigest);
 const bad=structuredClone(pending);bad.evidence[0].available=false;assert.throws(()=>readPendingAboutMigration(JSON.stringify(bad),site,actor));
});
test('only exact result and status identities complete recovery; unconfirmed remains pending',async()=>{
 const pending=makePendingAboutMigration(site,actor,selection,await verifyAboutReview(await review(),site,selection),key),result={recordId:'30000000-0000-4000-8000-000000000001',revisionId:'40000000-0000-4000-8000-000000000001'},response={requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};
 assert.deepEqual(verifyAboutReceipt(response,pending),result);assert.equal(verifyAboutRecovery({status:'unconfirmed',message:'Still pending'},pending),null);
 const status={status:'complete',requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,createdAt:'2026-10-22T00:00:00Z'};assert.deepEqual(verifyAboutRecovery(status,pending),result);
 for(const field of ['requestKey','sourceDigest','reviewDigest']){const wrong={...response,[field]:field==='requestKey'?site:'0'.repeat(64)};assert.throws(()=>verifyAboutReceipt(wrong,pending));assert.throws(()=>verifyAboutRecovery({...status,[field]:wrong[field]},pending));}
 const targeted={...pending,selection:{...selection,recordId:site,expectedRevision:actor}};assert.throws(()=>verifyAboutReceipt(response,targeted));
});
