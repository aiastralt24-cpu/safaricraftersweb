import test from 'node:test';import assert from 'node:assert/strict';
import {prepareTestimonialConflict} from '../lib/cms/testimonial-conflict.ts';
import {resolveDraftConflict} from '../lib/cms/draft-conflict.ts';
import {newTestimonial} from '../lib/cms/testimonials.ts';
const base=()=>({id:'review',type:'testimonial',path:null,locale:'en',currentRevision:'first',payload:{...newTestimonial(),quote:'Original quote'},permissions:{edit:true}});
test('testimonial conflicts retain independent edits and require whole consent decisions',()=>{
 const original=base(),mine={...original.payload,quote:'Local quote',consent:{status:'granted',evidence:'Email'}},latest={...original,currentRevision:'second',payload:{...original.payload,city:'Delhi',consent:{status:'withdrawn',evidence:'Revoked'}}};
 const c=prepareTestimonialConflict(original,mine,latest);assert.throws(()=>resolveDraftConflict(c.base,c.mine,c.remote,{}),/consent/);
 const merged=resolveDraftConflict(c.base,c.mine,c.remote,{consent:'latest'});assert.equal(merged.quote,'Local quote');assert.equal(merged.city,'Delhi');assert.deepEqual(merged.consent,{status:'withdrawn',evidence:'Revoked'});assert.ok(Object.hasOwn(c.base,'image'));
});
test('testimonial comparison rejects wrong identity, permissions, locale, revision and invalid payload',()=>{
 const original=base();for(const patch of [{id:'other'},{type:'specialist'},{path:'/review'},{locale:'fr'},{permissions:{edit:false}},{currentRevision:'first'},{payload:{}}])assert.throws(()=>prepareTestimonialConflict(original,original.payload,{...original,currentRevision:'second',...patch}));
});
