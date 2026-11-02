import test from 'node:test';import assert from 'node:assert/strict';
import {readHomepageMappingFile,readHomepageMigrationReview} from '../lib/cms/homepage-migration-client.ts';
import {handleHomepageMigrationReview} from '../lib/cms/homepage-migration-api.ts';
import {site,revision,makeHomepageMigrationFixture} from './fixtures/cms-homepage-migration.mjs';
async function example(){const {mappings,records}=makeHomepageMigrationFixture(),selection={site,recordId:null,expectedRevision:null,mappings};
 const response=await handleHomepageMigrationReview(new Request('http://localhost/api/cms/migrations/homepage',{method:'POST',headers:{authorization:'Bearer caller.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',...selection})}),async(_token,name,args)=>name==='can'?true:(name==='review_about_migration_media'||name==='review_hero_video_migration_media')?args.p_bindings.map(item=>({...item,available:true,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64)})):{...records.find(item=>item.id===args.p_record),permissions:{edit:false}});
 assert.equal(response.status,200);return {selection,value:await response.json()};
}
test('mapping upload accepts structured manifests and rejects malformed, oversized, empty or duplicate selections',()=>{
 const {mappings}=makeHomepageMigrationFixture();assert.deepEqual(readHomepageMappingFile(JSON.stringify(mappings)),mappings);
 for(const text of ['not json',' '.repeat(1_000_001),JSON.stringify({...mappings,records:[]}),JSON.stringify({...mappings,media:[mappings.media[0],mappings.media[0]]}),JSON.stringify({...mappings,records:[mappings.records[0],{...mappings.records[1],recordId:mappings.records[0].recordId}]})])assert.throws(()=>readHomepageMappingFile(text));
});
test('review parser accepts the exact selected capture, site, target and complete set of mapped records',async()=>{
 const {selection,value}=await example();const parsed=readHomepageMigrationReview(value,selection);assert.equal(parsed.recordComparison.sourceMatches,true);assert.equal(parsed.proposal.composition.sections.length,10);assert.equal(parsed.applyAvailable,true);
 for(const changed of [{...selection,site:revision},{...selection,recordId:revision,expectedRevision:revision},{...selection,mappings:{...selection.mappings,captureDigest:'0'.repeat(64)}}])assert.throws(()=>readHomepageMigrationReview(value,changed));
});
test('incomplete, inconsistent or incorrectly summarized responses never display successful review',async()=>{
 const {selection,value}=await example();
 for(const change of [v=>v.applyAvailable=false,v=>v.recordComparison.revisions.pop(),v=>v.recordComparison.revisions[1]=v.recordComparison.revisions[0],v=>v.recordComparison.sourceMatches=false,v=>v.proposal.composition.sections.pop(),v=>v.recordComparison.findings.push({sourceKey:'unknown',recordId:revision,field:'quote',code:'source_mismatch',message:'Wrong source'})]){const changed=structuredClone(value);change(changed);assert.throws(()=>readHomepageMigrationReview(changed,selection));}
});
test('video evidence from another asset or captured source never passes client validation',async()=>{
 const {selection,value}=await example();
 for(const change of [v=>v.mediaVerification.videos[0].evidence.sourceSha256='f'.repeat(64),v=>v.mediaVerification.videos[0].evidence.assetId=revision,v=>v.mediaVerification.videos[0].evidence.sourceMatches=false]){const altered=structuredClone(value);change(altered);assert.throws(()=>readHomepageMigrationReview(altered,selection));}
});

test('pending homepage recovery is account scoped, bounded and excludes page/consent copy',async()=>{
 const {homepageRecoveryKey,makePendingHomepageMigration,readPendingHomepageMigration,homepageApplyCommand}=await import('../lib/cms/homepage-migration-client.ts');
 const {selection,value}=await example(),actor='00000000-0000-4000-8000-000000000600',requestKey='00000000-0000-4000-8000-000000000700';
 const {site:website,...target}=selection,review=readHomepageMigrationReview(value,selection),pending=makePendingHomepageMigration(website,actor,target,review,requestKey),text=JSON.stringify(pending);
 assert.deepEqual(readPendingHomepageMigration(text,website,actor),pending);assert.notEqual(homepageRecoveryKey(website,actor),homepageRecoveryKey(website,requestKey));assert.equal(text.includes('PRIVATE_CONSENT'),false);assert.equal('proposal' in pending,false);assert.equal('payload' in pending,false);assert.equal(homepageApplyCommand(pending).requestKey,requestKey);
 assert.throws(()=>readPendingHomepageMigration(text,website,requestKey));assert.throws(()=>readPendingHomepageMigration(text,requestKey,actor));assert.throws(()=>readPendingHomepageMigration(' '.repeat(2_000_001),website,actor));
 for(const mutate of [p=>p.selection.mappings.media.pop(),p=>p.evidence.recordComparison.revisions.pop(),p=>p.evidence.mediaVerification.videos[0].evidence.available=false,p=>p.evidence.mediaVerification.images[0].sourceSha256='f'.repeat(64)]){const changed=structuredClone(pending);mutate(changed);assert.throws(()=>readPendingHomepageMigration(JSON.stringify(changed),website,actor));}
});
test('homepage completion requires the exact request, digests and new revision; unconfirmed status stays pending',async()=>{
 const {makePendingHomepageMigration,verifyHomepageReceipt,verifyHomepageRecovery}=await import('../lib/cms/homepage-migration-client.ts');
 const {selection,value}=await example(),actor='00000000-0000-4000-8000-000000000600',requestKey='00000000-0000-4000-8000-000000000700';const {site:website,...target}=selection,pending=makePendingHomepageMigration(website,actor,target,readHomepageMigrationReview(value,selection),requestKey);
 const result={recordId:actor,revisionId:revision},receipt={requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};assert.deepEqual(verifyHomepageReceipt(receipt,pending),result);assert.equal(verifyHomepageRecovery({status:'unconfirmed',message:'Still pending'},pending),null);
 const {replayed,...fields}=receipt;assert.deepEqual(verifyHomepageRecovery({status:'complete',...fields,createdAt:new Date().toISOString()},pending),result);
 for(const changed of [{...receipt,requestKey:actor},{...receipt,sourceDigest:'a'.repeat(64)},{...receipt,reviewDigest:'b'.repeat(64)},{...receipt,result:{recordId:actor,revisionId:'invalid'}}])assert.throws(()=>verifyHomepageReceipt(changed,pending));
});
