import test from 'node:test';import assert from 'node:assert/strict';import {analyzeReleaseDependencies} from '../lib/cms/release-dependencies.ts';
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
test('nested references order dependencies first, deduplicate edges and retain independent order',()=>{
 const records=[{id:ids[0],payload:{header:{mainMenu:{recordId:ids[1]},featured:[{recordId:ids[1]}]}}},{id:ids[2],payload:{}},{id:ids[1],payload:{items:[{recordId:ids[3]}]}},{id:ids[3],payload:{}}],before=structuredClone(records);
 const result=analyzeReleaseDependencies(records);assert.deepEqual(result.order,[ids[2],ids[3],ids[1],ids[0]]);assert.equal(result.edges.length,2);assert.deepEqual(records,before);
});
test('external references are reported, self links do not impose false dependencies, URLs are not guessed',()=>{
 const result=analyzeReleaseDependencies([{id:ids[0],payload:{recordId:ids[0],nested:{recordId:ids[4]},href:'/journeys/forest',assetId:ids[2]}}]);assert.deepEqual(result.order,[ids[0]]);assert.deepEqual(result.external,[{record:ids[0],target:ids[4]}]);assert.equal(result.scope,'explicit-references-and-selected-internal-paths');
});
test('cycles and their blocked consumers never return a partial recommended release',()=>{
 const result=analyzeReleaseDependencies([{id:ids[0],payload:{recordId:ids[1]}},{id:ids[1],payload:{recordId:ids[0]}},{id:ids[2],payload:{recordId:ids[1]}}]);assert.equal(result.order,null);assert.deepEqual(result.unresolved,[ids[0],ids[1],ids[2]]);
});
test('malformed, duplicate and excessively nested input fails closed',()=>{
 assert.throws(()=>analyzeReleaseDependencies([]));assert.throws(()=>analyzeReleaseDependencies([{id:ids[0],payload:{recordId:'bad'}}]));assert.throws(()=>analyzeReleaseDependencies([{id:ids[0],payload:{}},{id:ids[0],payload:{}}]));
 let payload={};for(let i=0;i<66;i++)payload={nested:payload};assert.throws(()=>analyzeReleaseDependencies([{id:ids[0],payload}]),/too complex/);
});
test('selected internal links order exact same-locale paths including query and fragment links',()=>{
 const result=analyzeReleaseDependencies([{id:ids[0],path:'/about',locale:'en',payload:{button:{href:'/journeys/forest?source=about#plan'},other:{href:'/missing'}}},{id:ids[1],path:'/journeys/forest',locale:'en',payload:{}}]);
 assert.deepEqual(result.order,[ids[1],ids[0]]);assert.deepEqual(result.externalLinks,[{record:ids[0],path:'/missing',locale:'en'}]);
});
test('path matching never guesses external origins, encoded paths, trailing slash aliases or another locale',()=>{
 const links=['https://example.test/forest','//example.test/forest','/forest/','/%66orest','/x/../forest','#forest'];
 const result=analyzeReleaseDependencies([{id:ids[0],locale:'en',path:'/about',payload:{links:links.map(href=>({href})),other:{href:'/forest'}}},{id:ids[1],locale:'fr',path:'/forest',payload:{}}]);assert.deepEqual(result.order,[ids[0],ids[1]]);assert.deepEqual(result.edges,[]);
 assert.throws(()=>analyzeReleaseDependencies([{id:ids[0],locale:'en',path:'/same',payload:{}},{id:ids[1],locale:'en',path:'/same',payload:{}}]),/Ambiguous/);
});
