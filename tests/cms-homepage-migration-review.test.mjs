import test from 'node:test';import assert from 'node:assert/strict';
import {homepageCaptureDigest,homepageMigrationDependencies,homepageMigrationMedia,homepageMigrationRecords,reviewHomepageMigration} from '../lib/cms/homepage-migration-review.ts';
const proof=()=>structuredClone(homepageMigrationDependencies);
const mappings=()=>({captureDigest:homepageCaptureDigest,media:[],records:[]});
test('homepage review accounts for media and typed record dependencies without inventing mappings',()=>{
 const review=reviewHomepageMigration(proof());
 assert.equal(review.readyToApply,false);assert.equal(review.mode,'review-only');assert.equal(review.sectionOrder.length,10);
 assert.equal(review.media.filter(item=>item.kind==='video').length,2);
 assert.equal(review.missingMedia.length,102);assert.equal(review.missingRecords.length,16);
 assert.equal(review.records.filter(item=>item.type==='journey').length,3);
 assert.equal(review.records.filter(item=>item.type==='photoExpedition').length,7);
 assert.equal(review.records.filter(item=>item.type==='testimonial').length,6);
 assert.ok(review.records.every(item=>item.proposedRecordId===null));
 assert.ok(review.records.filter(item=>item.type==='testimonial').every(item=>item.evidence.quote&&item.evidence.trip&&item.evidence.href));
});
test('homepage mappings require complete unchanged source evidence and exact capture identity',()=>{
 assert.throws(()=>reviewHomepageMigration(proof().slice(1)),/changed/);
 const altered=proof();altered[0].sha256='0'.repeat(64);assert.throws(()=>reviewHomepageMigration(altered),/changed/);
 const duplicate=proof();duplicate[1]=duplicate[0];assert.throws(()=>reviewHomepageMigration(duplicate),/Duplicate/);
 const stale=mappings();stale.captureDigest='0'.repeat(64);assert.throws(()=>reviewHomepageMigration(proof(),stale),/older/);
});
test('unknown, stale, duplicated or placeholder mappings cannot be mistaken for reviewed assets or records',()=>{
 const source=homepageMigrationMedia[0];const valid={sourcePath:source.sourcePath,sourceSha256:source.sha256,assetId:'asset-reviewed'};
 for(const media of [[{...valid,sourcePath:'/assets/unknown.png'}],[{...valid,sourceSha256:'0'.repeat(64)}],[valid,valid],[{...valid,assetId:'review-only-1'}]])assert.throws(()=>reviewHomepageMigration(proof(),{...mappings(),media}));
 const record={sourceKey:homepageMigrationRecords[0].sourceKey,recordId:'12345678-1234-4123-8123-123456789012'};
 for(const records of [[{...record,sourceKey:'journey:/unknown'}],[record,record],[record,{...record,sourceKey:homepageMigrationRecords[1].sourceKey}]])assert.throws(()=>reviewHomepageMigration(proof(),{...mappings(),records}));
 const review=reviewHomepageMigration(proof(),{...mappings(),media:[valid],records:[record]});
 assert.equal(review.missingMedia.length,101);assert.equal(review.missingRecords.length,15);
 assert.equal(review.records[0].proposedRecordId,record.recordId);assert.equal(review.readyToApply,false);
 assert.ok(review.findings.some(item=>item.code==='provider_verification_required'));
});
test('even a completely mapped source inventory cannot grant draft application or publication',()=>{
 const mapped={captureDigest:homepageCaptureDigest,
  media:homepageMigrationMedia.map((item,index)=>({sourcePath:item.sourcePath,sourceSha256:item.sha256,assetId:`asset-${index}`})),
  records:homepageMigrationRecords.map((item,index)=>({sourceKey:item.sourceKey,recordId:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`})),
 };
 const review=reviewHomepageMigration(proof(),mapped);
 assert.equal(review.missingMedia.length,0);assert.equal(review.missingRecords.length,0);assert.equal(review.readyToApply,false);
 assert.ok(review.findings.some(item=>item.code==='composition_pending'));
 assert.ok(review.findings.some(item=>item.code==='apply_unavailable'));
});
