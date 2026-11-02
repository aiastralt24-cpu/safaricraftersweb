import test from 'node:test';import assert from 'node:assert/strict';
import {filterContentHealth,defaultHealthFilters,healthNeedsAttention} from '../lib/cms/content-health-filters.ts';
const now=Date.parse('2026-10-28T00:00:00Z');
const row=(id,patch={})=>({id,title:id,type:'page',locale:'en',revision:'revision',publishedRevision:null,reviewStatus:'draft',validationState:'passed',expiresAt:'2026-10-29T00:00:00Z',warnings:0,...patch});
test('health filters combine title, type, exact language, review, validation and publication without mutating source',()=>{
 const rows=[row('a',{title:'Forest',locale:'fr',reviewStatus:'approved',publishedRevision:'revision'}),row('b',{title:'Forest',locale:'fr-CA'}),row('c',{type:'journey',validationState:'failed'})];
 const result=filterContentHealth(rows,{...defaultHealthFilters,query:' FOREST ',locale:'fr',type:'page',review:'approved',validation:'passed',publication:'current'},now);assert.deepEqual(result.map(r=>r.id),['a']);assert.deepEqual(rows.map(r=>r.id),['a','b','c']);
 assert.deepEqual(filterContentHealth(rows,{...defaultHealthFilters,publication:'unpublished'},now).map(r=>r.id),['c','b']);
 assert.equal(filterContentHealth(rows,{...defaultHealthFilters,query:'missing'},now).length,0);
 assert.equal(filterContentHealth([row('d',{publishedRevision:'older'})],{...defaultHealthFilters,publication:'changed'},now).length,1);
});
test('attention uses receipt expiry and editorial review, with deterministic error-first ordering',()=>{
 const rows=[row('z'),row('a',{expiresAt:'2026-10-27T00:00:00Z'}),row('b',{reviewStatus:'changes_requested'}),row('c',{validationState:'failed'}),row('d',{warnings:1}),row('e',{reviewStatus:'in_review'})];
 assert.deepEqual(filterContentHealth(rows,{...defaultHealthFilters,validation:'attention'},now).map(r=>r.id),['c','b','a','d','e']);assert.equal(healthNeedsAttention(rows[0],now),false);
 assert.deepEqual(filterContentHealth(rows,{...defaultHealthFilters,validation:'stale'},now).map(r=>r.id),['a']);
 assert.deepEqual(filterContentHealth(rows,{...defaultHealthFilters,order:'title'},now).map(r=>r.id),['a','b','c','d','e','z']);
});
