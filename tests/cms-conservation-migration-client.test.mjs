import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/conservation-migration-inventory.json' with {type:'json'};
import {handleConservationMigrationReview} from '../lib/cms/conservation-migration-api.ts';
import {verifyConservationReview,makePendingConservationMigration,readPendingConservationMigration,conservationRecoveryKey,verifyConservationReceipt,verifyConservationRecovery,conservationApplyCommand} from '../lib/cms/conservation-migration-client.ts';
const site='00000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000001',key='20000000-0000-4000-8000-000000000001';
const selection={recordId:null,expectedRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`asset-${i}`}))};
async function review(){const request=new Request('http://localhost/api/cms/migrations/conservation',{method:'POST',headers:{authorization:'Bearer test.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',site,...selection})});return (await handleConservationMigrationReview(request,async(_token,name,args)=>name==='can'?true:args.p_bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true})))).json();}
test('browser review verification binds proposal, target, source and evidence to server digests',async()=>{
 const input=await review();assert.equal((await verifyConservationReview(input,site,selection)).applyAvailable,true);
 for(const change of [v=>v.proposal.composition.title='Tampered',v=>v.proposal.seo.socialImage.assetId='substituted',v=>v.proposal.seo.canonical='https://foreign.test/page',v=>v.reviewDigest='0'.repeat(64),v=>v.sourceDigest='0'.repeat(64),v=>v.applyAvailable=false,v=>v.verification.unavailable=['asset-0'],v=>v.verification.evidence.reverse(),v=>v.before={unexpected:'draft'}]){const bad=structuredClone(input);change(bad);await assert.rejects(verifyConservationReview(bad,site,selection));}
 await assert.rejects(verifyConservationReview(input,site,{...selection,bindings:[...selection.bindings].reverse()}));
});
test('recovery persists bounded identities and evidence, never content or credentials, and reconstructs the exact apply command',async()=>{
 const checked=await verifyConservationReview(await review(),site,selection),pending=makePendingConservationMigration(site,actor,selection,checked,key),stored=JSON.stringify(pending);
 assert.doesNotMatch(stored,/Founded|composition|Bearer|proposal|before|biography/);
 assert.deepEqual(readPendingConservationMigration(stored,site,actor),pending);assert.match(conservationRecoveryKey(site,actor),new RegExp(actor));assert.equal(readPendingConservationMigration(null,site,actor),null);
 assert.throws(()=>readPendingConservationMigration(stored,site,key));assert.throws(()=>readPendingConservationMigration(' '.repeat(20001),site,actor));assert.throws(()=>readPendingConservationMigration(JSON.stringify({...pending,proposal:{}}),site,actor));
 const command=conservationApplyCommand(pending);assert.equal(command.requestKey,key);assert.deepEqual(command.evidence,checked.verification.evidence);assert.deepEqual(command.bindings,selection.bindings);assert.equal(command.reviewDigest,checked.reviewDigest);
 const bad=structuredClone(pending);bad.evidence[0].available=false;assert.throws(()=>readPendingConservationMigration(JSON.stringify(bad),site,actor));
});
test('only exact result and status identities complete recovery; unconfirmed remains pending',async()=>{
 const pending=makePendingConservationMigration(site,actor,selection,await verifyConservationReview(await review(),site,selection),key),result={recordId:'30000000-0000-4000-8000-000000000001',revisionId:'40000000-0000-4000-8000-000000000001'},response={requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};
 assert.deepEqual(verifyConservationReceipt(response,pending),result);assert.equal(verifyConservationRecovery({status:'unconfirmed',message:'Still pending'},pending),null);
 const status={status:'complete',requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,createdAt:'2026-10-22T00:00:00Z'};assert.deepEqual(verifyConservationRecovery(status,pending),result);
 for(const field of ['requestKey','sourceDigest','reviewDigest']){const wrong={...response,[field]:field==='requestKey'?site:'0'.repeat(64)};assert.throws(()=>verifyConservationReceipt(wrong,pending));assert.throws(()=>verifyConservationRecovery({...status,[field]:wrong[field]},pending));}
 const targeted={...pending,selection:{...selection,recordId:site,expectedRevision:actor}};assert.throws(()=>verifyConservationReceipt(response,targeted));
});
