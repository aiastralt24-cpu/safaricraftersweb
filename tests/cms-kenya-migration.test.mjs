import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/kenya-source-inventory.json' with {type:'json'};
import {planKenyaMigration,kenyaMigrationDependencies} from '../lib/cms/kenya-migration.ts';
import {kenyaCombinations,kenyaPlaces} from '../content/kenya-editorial.ts';
const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`inspected-${i}`}));
test('Kenya offline proposal binds current source files and all eight media files',async()=>{
 const proof=await Promise.all(kenyaMigrationDependencies.map(async s=>({sourcePath:s.sourcePath,sha256:createHash('sha256').update(await readFile(new URL('../'+s.sourcePath,import.meta.url))).digest('hex')})));
 const p=planKenyaMigration(proof);assert.equal(p.mode,'review-only');assert.equal(p.readyToApply,false);assert.equal(p.missingMedia.length,8);assert.equal(p.path,'/destinations/kenya');assert.equal(p.previewPayload.composition.sections.length,10);
 assert.deepEqual(p.metadata,inventory.views[0].metadata);assert.equal(p.previewPayload.seo.canonical,p.metadata.canonical);
});
test('Kenya proposal preserves source prose, headings, links, FAQ, alt text and non-displayed copy',()=>{
 const p=planKenyaMigration(kenyaMigrationDependencies,bindings),sections=p.previewPayload.composition.sections,source=inventory.views[0].content;
 const d=kind=>sections.find(s=>s.kind===kind).data;
 assert.equal(p.missingMedia.length,0);assert.equal(p.readyToApply,false);
 assert.deepEqual(d('kenyaIntroduction').heading.lines,source[2].headings[0].lines);
 assert.deepEqual(d('kenyaLuxury').paragraphs.map(p=>p.text),source[5].paragraphs.slice(1));assert.equal(d('kenyaLuxury').paragraphs.at(-1).emphasized,true);
 assert.deepEqual(d('kenyaFaq').items.map(({id,...item})=>item),source[7].faq);
 assert.deepEqual(d('kenyaPlaces').items.map(p=>p.subtitle),kenyaPlaces.map(p=>p.subtitle));
 assert.deepEqual(d('kenyaItineraries').items.map(p=>p.copy),kenyaCombinations.map(p=>p.copy));
 assert.deepEqual(d('kenyaItineraries').items.map(p=>p.button.href),source[6].links.map(l=>l.href));
 assert.equal(d('kenyaRelated').items[1].button.label,'Explore Uganda & Rwanda');
 assert.equal(d('kenyaHero').breadcrumbs.at(-1).href,undefined);assert.deepEqual(d('kenyaHero').focalPoint,{x:35,y:100});
 assert.equal(d('kenyaGallery').images[1].image.assetId,d('kenyaItineraries').items[1].image.assetId);
 assert.equal(d('kenyaGallery').images[1].image.credit,'Safari Crafters archive');assert.equal(d('kenyaItineraries').items[1].image.credit,undefined);
 assert.deepEqual(d('kenyaGallery').images.map(m=>m.image.alt),source[4].images.map(m=>m.alt));
 const serialized=JSON.stringify(p.previewPayload);assert.ok(!serialized.includes('review-only-'));assert.ok(!serialized.includes('/assets/'));
 // A consumer may edit a proposal without mutating retained evidence or future proposals.
 d('kenyaIntroduction').heading.lines[0].runs[0].text='Modified';assert.deepEqual(planKenyaMigration(kenyaMigrationDependencies).previewPayload.composition.sections[2].data.heading.lines,source[2].headings[0].lines);
});
test('Kenya migration rejects stale, incomplete, duplicate or unrelated evidence and forged bindings',()=>{
 const badProofs=[kenyaMigrationDependencies.slice(1),[...kenyaMigrationDependencies,kenyaMigrationDependencies[0]],kenyaMigrationDependencies.map((s,i)=>i? s:{...s,sha256:'0'.repeat(64)}),kenyaMigrationDependencies.map((s,i)=>i?s:{...s,sourcePath:'other.ts'})];
 for(const proof of badProofs)assert.throws(()=>planKenyaMigration(proof),/source changed/);
 for(const bad of [[bindings[0],bindings[0]],[{...bindings[0],sourceSha256:'0'.repeat(64)}],[{...bindings[0],sourcePath:'/assets/unknown.jpg'}],bindings.map(b=>({...b,assetId:'same-asset'})),[{...bindings[0],assetId:'review-only-kenya-1'}],[{...bindings[0],assetId:'/assets/legacy.jpg'}],[{...bindings[0],approved:true}]])assert.throws(()=>planKenyaMigration(kenyaMigrationDependencies,bad));
});
