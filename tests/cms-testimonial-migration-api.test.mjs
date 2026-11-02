import test from 'node:test';
import assert from 'node:assert/strict';
import {handleTestimonialMigration} from '../lib/cms/testimonial-migration-api.ts';
const id='00000000-0000-4000-8000-000000000001';
const input={action:'review',site:id,locale:'en',source:[{name:'Synthetic guest',quote:'Forest trip'}]};
const request=body=>new Request('https://site.test/api/cms/migrations/testimonials',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('migration apply rebuilds exact review and forwards only user-authorized draft manifest',async()=>{
 const reviewed=await handleTestimonialMigration(request(input),async()=>{throw Error('review must not write');});assert.equal(reviewed.status,200);const review=await reviewed.json();
 let calls=[];const apply={...input,action:'apply',requestKey:id,reviewDigest:review.reviewDigest};
 const response=await handleTestimonialMigration(request(apply),async(...args)=>{calls.push(args);return [];});assert.equal(response.status,200);assert.equal(calls[0][0],'a.b.c');assert.equal(calls[0][1],'apply_testimonial_migration');assert.equal(calls[0][2].p_items[0].payload.consent.status,'pending');assert.deepEqual(calls[0][2].p_items[0].source,input.source[0]);
 for(const changed of [{...apply,source:[{name:'Synthetic guest',quote:'Changed'}]},{...apply,locale:'fr'},{...apply,reviewDigest:'a'.repeat(64)}])assert.equal((await handleTestimonialMigration(request(changed),async()=>{throw Error('must not write');})).status,409);
});
test('invalid and duplicate migration sources cannot be applied',async()=>{
 for(const source of [[{name:'Missing quote'}],[input.source[0],input.source[0]]]){
  const body={...input,source};const review=await (await handleTestimonialMigration(request(body))).json();assert.equal((await handleTestimonialMigration(request({...body,action:'apply',requestKey:id,reviewDigest:review.reviewDigest}),async()=>{throw Error('must not write');})).status,422);
 }
});
