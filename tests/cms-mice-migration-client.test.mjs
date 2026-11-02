import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/mice-migration-inventory.json' with {type:'json'};
import {handleMiceMigrationReview} from '../lib/cms/mice-migration-api.ts';
import {verifyMiceReview,makePendingMiceMigration,readPendingMiceMigration,miceRecoveryKey,verifyMiceReceipt,verifyMiceRecovery,miceApplyCommand} from '../lib/cms/mice-migration-client.ts';
const site='00000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000001',key='20000000-0000-4000-8000-000000000001';
const selection={recordId:null,expectedRevision:null,formId:'50000000-0000-4000-8000-000000000001',bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`asset-${i}`}))};
async function review(){const request=new Request('http://localhost/api/cms/migrations/mice',{method:'POST',headers:{authorization:'Bearer test.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',site,...selection})});return (await handleMiceMigrationReview(request,async(_token,name,args)=>name==='can'?true:name==='review_mice_migration_form'?{recordId:selection.formId,revisionId:'60000000-0000-4000-8000-000000000001',locale:'en',available:true}:args.p_bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true})))).json();}
test('browser review verification binds proposal, target, source and evidence to server digests',async()=>{
 const input=await review();assert.equal((await verifyMiceReview(input,site,selection)).applyAvailable,true);
 for(const change of [v=>v.proposal.composition.title='Tampered',v=>v.metadata.title='Wrong metadata' ,v=>v.proposal.seo.canonical='https://foreign.test/page',v=>v.reviewDigest='0'.repeat(64),v=>v.sourceDigest='0'.repeat(64),v=>v.applyAvailable=false,v=>v.verification.unavailable=['asset-0'],v=>v.verification.evidence.reverse(),v=>v.before={unexpected:'draft'},v=>v.formEvidence.revisionId=site,v=>v.selection.site=actor]){const bad=structuredClone(input);change(bad);await assert.rejects(verifyMiceReview(bad,site,selection));}
 await assert.rejects(verifyMiceReview(input,site,{...selection,bindings:[...selection.bindings].reverse()}));
});
test('recovery persists bounded identities and evidence, never content or credentials, and reconstructs the exact apply command',async()=>{
 const checked=await verifyMiceReview(await review(),site,selection),pending=await makePendingMiceMigration(site,actor,selection,checked,key),stored=JSON.stringify(pending);
 assert.doesNotMatch(stored,/Founded|composition|Bearer|proposal|before|biography/);
 assert.deepEqual(readPendingMiceMigration(stored,site,actor),pending);assert.match(miceRecoveryKey(site,actor),new RegExp(actor));assert.equal(readPendingMiceMigration(null,site,actor),null);
 assert.throws(()=>readPendingMiceMigration(stored,site,key));assert.throws(()=>readPendingMiceMigration(' '.repeat(20001),site,actor));assert.throws(()=>readPendingMiceMigration(JSON.stringify({...pending,proposal:{}}),site,actor));
 const command=miceApplyCommand(pending);assert.equal(command.requestKey,key);assert.deepEqual(command.evidence,checked.verification.evidence);assert.deepEqual(command.bindings,selection.bindings);assert.equal(command.reviewDigest,checked.reviewDigest);assert.deepEqual(command.formEvidence,checked.formEvidence);
 const wrongForm=structuredClone(pending);wrongForm.formEvidence.recordId=site;assert.throws(()=>readPendingMiceMigration(JSON.stringify(wrongForm),site,actor));
 const bad=structuredClone(pending);bad.evidence[0].available=false;assert.throws(()=>readPendingMiceMigration(JSON.stringify(bad),site,actor));
});
test('only exact result and status identities complete recovery; unconfirmed remains pending',async()=>{
 const pending=await makePendingMiceMigration(site,actor,selection,await verifyMiceReview(await review(),site,selection),key),result={recordId:'30000000-0000-4000-8000-000000000001',revisionId:'40000000-0000-4000-8000-000000000001'},response={requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};
 assert.deepEqual(verifyMiceReceipt(response,pending),result);assert.equal(verifyMiceRecovery({status:'unconfirmed',message:'Still pending'},pending),null);
 const status={status:'complete',requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,createdAt:'2026-10-22T00:00:00Z'};assert.deepEqual(verifyMiceRecovery(status,pending),result);
 for(const field of ['requestKey','sourceDigest','reviewDigest']){const wrong={...response,[field]:field==='requestKey'?site:'0'.repeat(64)};assert.throws(()=>verifyMiceReceipt(wrong,pending));assert.throws(()=>verifyMiceRecovery({...status,[field]:wrong[field]},pending));}
 const targeted={...pending,selection:{...selection,recordId:site,expectedRevision:actor}};assert.throws(()=>verifyMiceReceipt(response,targeted));
});
