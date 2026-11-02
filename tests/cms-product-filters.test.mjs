import test from 'node:test';import assert from 'node:assert/strict';
import {productEnvelope,site} from './fixtures/product-public.mjs';
import {projectProductFilters,productFilterEvidence} from '../lib/cms/product-filter-evidence.ts';
import {productFilterOptions,productFilterToken,matchesProductFilters} from '../lib/cms/product-filters.ts';
const evidence=()=>{const e=productEnvelope();for(const a of e.categories[0].attributeGroups[0].attributes)a.filterEligible=true;return {category:e.payload.category,subcategory:e.payload.subcategory,specifications:e.payload.specifications,categories:e.categories};};
test('filter evidence validates exact definitions and emits only permitted typed public attributes',()=>{
 const e=evidence(),attributes=projectProductFilters(e,site);assert.deepEqual(attributes.map(a=>a.value),[{state:'known',value:0},{state:'known',value:false},{state:'blank'}]);assert.ok(!JSON.stringify(attributes).includes(e.category.recordId));
 e.categories[0].attributeGroups[0].attributes[0].filterEligible=false;assert.equal(projectProductFilters(e,site).length,2);
 for(const mutate of [e=>e.categories[0].revisionId='00000000-0000-4000-8000-000000000099',e=>e.specifications[0].value.value='0',e=>e.specifications[0].attributeId='invented',e=>e.categories.push(e.categories[0])]){const e=evidence();mutate(e);assert.throws(()=>projectProductFilters(e,site));}
 assert.equal(productFilterEvidence.safeParse({...evidence(),internalNotes:'private'}).success,false);
});
test('filter tokens distinguish types and missing states, with AND semantics and explicit no results',()=>{
 const a={attributes:projectProductFilters(evidence(),site)},e=evidence();e.specifications[0].value={state:'known',value:12};e.specifications[1].value={state:'unknown'};const b={attributes:projectProductFilters(e,site)},options=productFilterOptions([a,b]);assert.equal(options.length,3);
 assert.notEqual(productFilterToken({state:'known',value:0}),productFilterToken({state:'known',value:'0'}));assert.notEqual(productFilterToken({state:'known',value:false}),productFilterToken({state:'known',value:'false'}));assert.equal(new Set([null,{state:'blank'},{state:'unknown'},{state:'notApplicable',reason:'None'}].map(productFilterToken)).size,4);
 const width=a.attributes[0],recycled=a.attributes[1],filters={[width.key]:productFilterToken(width.value)};assert.equal(matchesProductFilters(a,filters),true);assert.equal(matchesProductFilters(b,filters),false);filters[recycled.key]='unknown';assert.equal(matchesProductFilters(a,filters),false);assert.equal(matchesProductFilters(b,filters),false);assert.equal(matchesProductFilters(a,{}),true);
 assert.equal(matchesProductFilters(a,{'missing':'unknown'}),false);a.attributes[0].filterEligible=false;assert.equal(matchesProductFilters(a,{[width.key]:productFilterToken(width.value)}),false);
});
