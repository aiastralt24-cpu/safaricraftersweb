import test from 'node:test';import assert from 'node:assert/strict';
import {productEnvelope,site} from './fixtures/product-public.mjs';
import {projectPublishedProduct} from '../lib/cms/published-product.ts';
import {productComparisonRows,comparisonSlugs} from '../lib/cms/product-comparison.ts';
const project=value=>projectPublishedProduct(value,value.path,site);
const fixture=()=>{const e=productEnvelope();for(const a of e.categories[0].attributeGroups[0].attributes)a.comparisonEligible=true;return e;};
test('comparison only exposes enabled attributes and preserves typed false, zero, blank and missing values',()=>{
 assert.deepEqual(project(productEnvelope()).attributes,[]);
 const e=fixture(),p=project(e);assert.deepEqual(p.attributes.map(a=>a.value),[{state:'known',value:0},{state:'known',value:false},{state:'blank'}]);
 const other=fixture();other.payload.specifications=[];
 assert.deepEqual(productComparisonRows([p,project(other)]).map(r=>r.values),[['0','Not entered'],['No','Not entered'],['Blank','Not entered']]);
 e.categories[0].attributeGroups[0].attributes[0].comparisonEligible=false;e.categories[0].attributeGroups[0].attributes[0].filterEligible=true;
 const filtered=project(e);assert.equal(filtered.attributes.length,3);assert.equal(productComparisonRows([filtered]).length,2);
 assert.ok(!JSON.stringify(filtered.attributes).includes(e.categories[0].recordId));
});
test('comparison never equates different units, types, regions, category identities or labels',()=>{
 const base=fixture();for(const mutate of [e=>e.categories[0].attributeGroups[0].attributes[0].unit='cm',e=>e.categories[0].slug='other',e=>e.categories[0].attributeGroups[0].attributes[0].label='Other diameter',e=>{e.categories[0].attributeGroups[0].attributes[0].regions=[{countryCode:'IN',region:'Gujarat'}];e.payload.specifications[0].region={countryCode:'IN',region:'Gujarat'};}]){
  const other=fixture();mutate(other);const rows=productComparisonRows([project(base),project(other)]);assert.equal(rows.length,other.categories[0].slug==='other'?6:4);assert.ok(rows.some(r=>r.values[0]==='0'&&r.values[1]==='Not comparable'));
 }
 const e=fixture();e.payload.specifications[0].value={state:'unknown'};e.payload.specifications[1].value={state:'notApplicable',reason:'Not recycled'};assert.deepEqual(productComparisonRows([project(e)]).slice(0,2).map(r=>r.values),[['Unknown'],['Not applicable: Not recycled']]);
});
test('comparison selection bounds reads and rejects duplicate, malformed or incomplete selection',()=>{
 assert.deepEqual(comparisonSlugs(['one','two']),['one','two']);assert.equal(comparisonSlugs(undefined),null);assert.equal(comparisonSlugs('one'),null);
 for(const value of [['one','one'],['one','../private'],['a','b','c','d','e'],['one','']])assert.equal(comparisonSlugs(value),null);
});
