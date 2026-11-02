import test from 'node:test';
import assert from 'node:assert/strict';
import {planTestimonialMigration,sourceDigest} from '../lib/cms/testimonial-migration.ts';
const source={name:'Synthetic Guest',quote:'An unforgettable forest.',city:'Example',trip:'Forest trip',consented:true,verified:true,image:{src:'/old-image.jpg',alt:'Forest'},destinationSlug:'forest',video:{url:'https://example.test/video'}};
test('migration preserves source and flags unsupported data without inventing consent evidence',()=>{
 const original=structuredClone(source);const plan=planTestimonialMigration([source]);const item=plan.candidates[0];
 assert.equal(plan.operation,'review_only');assert.equal(item.canSaveDraft,true);assert.equal(item.payload.consent.status,'pending');assert.equal(item.payload.image,undefined);assert.deepEqual(item.source,source);assert.deepEqual(source,original);assert.ok(item.issues.some(i=>i.field==='video'));assert.deepEqual(item.unmappedFields,['destinationSlug']);
});
test('reviewed mappings bind to exact content and stale mappings are reported',()=>{
 const key=`snapshot:${sourceDigest(source)}`,mapping={[key]:{consentEvidence:'Reference 42',image:{assetId:'inspected-image',alt:'Forest'}}};
 const item=planTestimonialMigration([source],mapping).candidates[0];assert.equal(item.payload.consent.status,'granted');assert.equal(item.payload.image.assetId,'inspected-image');
 const changed=planTestimonialMigration([{...source,quote:'Changed words'}],mapping);assert.deepEqual(changed.unusedMappings,[key]);assert.equal(changed.candidates[0].payload.consent.status,'pending');
 const denied={...source,consented:false};assert.equal(planTestimonialMigration([denied],{[`snapshot:${sourceDigest(denied)}`]:{consentEvidence:'Reference'}}).candidates[0].payload.consent.status,'pending');
});
test('invalid and duplicate records are review errors, not silently coerced or merged',()=>{
 const result=planTestimonialMigration([source,source,{name:123,quote:''}]);assert.equal(result.count,3);assert.equal(result.candidates[0].canSaveDraft,false);assert.equal(result.candidates[1].canSaveDraft,false);assert.equal(result.candidates[2].canSaveDraft,false);assert.equal(sourceDigest({a:1,b:2}),sourceDigest({b:2,a:1}));
 assert.throws(()=>planTestimonialMigration([source],{unknown:{unexpected:true}}));
});
