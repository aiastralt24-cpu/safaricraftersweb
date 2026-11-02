import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/tanzania-source-inventory.json' with {type:'json'};
import {planTanzaniaMigration,tanzaniaMigrationDependencies} from '../lib/cms/tanzania-migration.ts';
import {validateComposition} from '../lib/cms/composition.ts';
const proof=()=>structuredClone(tanzaniaMigrationDependencies);
const bindings=()=>inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`asset-${i}`}));
test('Tanzania inventory binds current source, media and both responsive interaction captures',async()=>{
 for(const source of tanzaniaMigrationDependencies){const bytes=await fs.readFile(new URL(`../${source.sourcePath}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,source.sourcePath);}
 assert.equal(inventory.views.length,2);assert.deepEqual(inventory.views.map(v=>v.content.length),[9,9]);assert.equal(inventory.media.length,12);assert.equal(inventory.states.filter(s=>s.kind==='planner').length,20);assert.equal(inventory.states.filter(s=>s.kind==='gallery').length,18);assert.equal(inventory.states.filter(s=>s.kind==='faq').length,10);
});
test('Tanzania review retains nine groups, captured media/credits and planner context without authorizing a write',()=>{
 const review=planTanzaniaMigration(proof());assert.equal(review.readyToApply,false);assert.equal(review.missingMedia.length,12);assert.equal(validateComposition(review.previewPayload.composition).valid,true);
 const full=planTanzaniaMigration(proof(),bindings());assert.equal(full.readyToApply,false);assert.equal(full.missingMedia.length,0);assert.equal(full.previewPayload.composition.sections.length,9);assert.equal(full.previewPayload.seo.canonical,'https://safaricrafters.com/destinations/tanzania');
 const group=kind=>full.previewPayload.composition.sections.find(s=>s.kind===kind).data;assert.equal(group('tanzaniaGallery').images.length,9);assert.equal(group('tanzaniaHero').image.credit,'Safari Crafters archive');assert.equal(group('tanzaniaGallery').images[0].image.credit,'Safari Crafters archive');assert.equal(group('tanzaniaPlaces').items[2].planner.interest,'Ndutu, Tanzania');assert.match(group('tanzaniaPlaces').items[2].imageCaption,/wider Serengeti/);assert.equal(group('tanzaniaItineraries').items.length,4);assert.equal(group('tanzaniaFaq').items.length,5);
 full.previewPayload.composition.sections[0].data.title='Changed';assert.equal(planTanzaniaMigration(proof(),bindings()).previewPayload.composition.sections[0].data.title,'Tanzania');
});
test('Tanzania review rejects stale, duplicate, foreign and conflicting evidence',()=>{
 for(const p of [proof().slice(1),[...proof(),proof()[0]],proof().map((x,i)=>i?x:{...x,sha256:'0'.repeat(64)})])assert.throws(()=>planTanzaniaMigration(p),/source changed/);
 const b=bindings();for(const input of [[b[0],b[0]],[{...b[0],sourceSha256:'0'.repeat(64)}],[{...b[0],sourcePath:'/assets/unknown.webp'}],[{...b[0],assetId:'review-only-placeholder'}],[b[0],{...b[1],assetId:b[0].assetId}]])assert.throws(()=>planTanzaniaMigration(proof(),input));
});
