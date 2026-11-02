import test from 'node:test';import assert from 'node:assert/strict';
import {readConceptMappingFile,readConceptMigrationReview} from '../lib/cms/concept-migration-client.ts';
import {handleConceptMigrationReview} from '../lib/cms/concept-migration-api.ts';
import {site,revision,makeConceptMigrationFixture} from './fixtures/cms-concept-migration.mjs';
async function example(){const {mappings,records}=makeConceptMigrationFixture(),selection={site,recordId:null,expectedRevision:null,mappings};
 const response=await handleConceptMigrationReview(new Request('http://localhost/api/cms/migrations/concept',{method:'POST',headers:{authorization:'Bearer caller.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',...selection})}),async(_token,name,args)=>name==='can'?true:(name==='review_about_migration_media'||name==='review_hero_video_migration_media')?args.p_bindings.map(item=>({...item,available:true,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64)})):{...records.find(item=>item.id===args.p_record),permissions:{edit:false}});
 assert.equal(response.status,200);return {selection,value:await response.json()};
}
test('mapping upload accepts structured manifests and rejects malformed, oversized, empty or duplicate selections',()=>{
 const {mappings}=makeConceptMigrationFixture();assert.deepEqual(readConceptMappingFile(JSON.stringify(mappings)),mappings);
 for(const text of ['not json',' '.repeat(1_000_001),JSON.stringify({...mappings,records:[]}),JSON.stringify({...mappings,media:[mappings.media[0],mappings.media[0]]}),JSON.stringify({...mappings,records:[mappings.records[0],{...mappings.records[1],recordId:mappings.records[0].recordId}]})])assert.throws(()=>readConceptMappingFile(text));
});
test('review parser accepts the exact selected capture, site, target and complete set of mapped records',async()=>{
 const {selection,value}=await example();const parsed=readConceptMigrationReview(value,selection);assert.equal(parsed.recordComparison.sourceMatches,true);assert.equal(parsed.proposal.composition.sections.length,10);assert.equal(parsed.applyAvailable,true);
 for(const changed of [{...selection,site:revision},{...selection,recordId:revision,expectedRevision:revision},{...selection,mappings:{...selection.mappings,captureDigest:'0'.repeat(64)}}])assert.throws(()=>readConceptMigrationReview(value,changed));
});
test('incomplete, inconsistent or incorrectly summarized responses never display successful review',async()=>{
 const {selection,value}=await example();
 for(const change of [v=>v.applyAvailable=false,v=>v.recordComparison.revisions.pop(),v=>v.recordComparison.revisions[1]=v.recordComparison.revisions[0],v=>v.recordComparison.sourceMatches=false,v=>v.proposal.composition.sections.pop(),v=>v.recordComparison.findings.push({sourceKey:'unknown',recordId:revision,field:'quote',code:'source_mismatch',message:'Wrong source'})]){const changed=structuredClone(value);change(changed);assert.throws(()=>readConceptMigrationReview(changed,selection));}
});
test('video evidence from another asset or captured source never passes client validation',async()=>{
 const {selection,value}=await example();
 for(const change of [v=>v.mediaVerification.videos[0].evidence.sourceSha256='f'.repeat(64),v=>v.mediaVerification.videos[0].evidence.assetId=revision,v=>v.mediaVerification.videos[0].evidence.sourceMatches=false]){const altered=structuredClone(value);change(altered);assert.throws(()=>readConceptMigrationReview(altered,selection));}
});

test('pending concept recovery is account scoped, bounded and excludes page/consent copy',async()=>{
 const {conceptRecoveryKey,makePendingConceptMigration,readPendingConceptMigration,conceptApplyCommand}=await import('../lib/cms/concept-migration-client.ts');
 const {selection,value}=await example(),actor='00000000-0000-4000-8000-000000000600',requestKey='00000000-0000-4000-8000-000000000700';
 const {site:website,...target}=selection,review=readConceptMigrationReview(value,selection),pending=makePendingConceptMigration(website,actor,target,review,requestKey),text=JSON.stringify(pending);
 assert.deepEqual(readPendingConceptMigration(text,website,actor),pending);assert.notEqual(conceptRecoveryKey(website,actor),conceptRecoveryKey(website,requestKey));assert.equal(text.includes('PRIVATE_CONSENT'),false);assert.equal('proposal' in pending,false);assert.equal('payload' in pending,false);assert.equal(conceptApplyCommand(pending).requestKey,requestKey);
 assert.throws(()=>readPendingConceptMigration(text,website,requestKey));assert.throws(()=>readPendingConceptMigration(text,requestKey,actor));assert.throws(()=>readPendingConceptMigration(' '.repeat(2_000_001),website,actor));
 for(const mutate of [p=>p.selection.mappings.media.pop(),p=>p.evidence.recordComparison.revisions.pop(),p=>p.evidence.mediaVerification.videos[0].evidence.available=false,p=>p.evidence.mediaVerification.images[0].sourceSha256='f'.repeat(64)]){const changed=structuredClone(pending);mutate(changed);assert.throws(()=>readPendingConceptMigration(JSON.stringify(changed),website,actor));}
});
test('concept completion requires the exact request, digests and new revision; unconfirmed status stays pending',async()=>{
 const {makePendingConceptMigration,verifyConceptReceipt,verifyConceptRecovery}=await import('../lib/cms/concept-migration-client.ts');
 const {selection,value}=await example(),actor='00000000-0000-4000-8000-000000000600',requestKey='00000000-0000-4000-8000-000000000700';const {site:website,...target}=selection,pending=makePendingConceptMigration(website,actor,target,readConceptMigrationReview(value,selection),requestKey);
 const result={recordId:actor,revisionId:revision},receipt={requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};assert.deepEqual(verifyConceptReceipt(receipt,pending),result);assert.equal(verifyConceptRecovery({status:'unconfirmed',message:'Still pending'},pending),null);
 const {replayed,...fields}=receipt;assert.deepEqual(verifyConceptRecovery({status:'complete',...fields,createdAt:new Date().toISOString()},pending),result);
 for(const changed of [{...receipt,requestKey:actor},{...receipt,sourceDigest:'a'.repeat(64)},{...receipt,reviewDigest:'b'.repeat(64)},{...receipt,result:{recordId:actor,revisionId:'invalid'}}])assert.throws(()=>verifyConceptReceipt(changed,pending));
});
