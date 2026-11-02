import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/guided-safaris-migration-inventory.json' with {type:'json'};
import {planGuidedSafarisMigration,guidedMigrationDependencies} from '../lib/cms/guided-safaris-migration.ts';
import {projectGuidedSafarisPage} from '../lib/cms/guided-safaris-page.ts';
const proof=structuredClone(guidedMigrationDependencies),bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`processed-${i+1}`}));
test('Bespoke migration retains every captured section text, heading, image, card action and FAQ',()=>{
 const original=structuredClone(inventory),proposal=planGuidedSafarisMigration(proof,bindings),sections=proposal.previewPayload.composition.sections;
 assert.equal(sections.length,8);assert.deepEqual(sections.map(s=>s.controls.background),['ink','paper','paper','white','forest','white','paper','white']);assert.equal(sections[4].controls.mediaAlign,'start');assert.equal(sections[5].controls.mobileOrder,'mediaFirst');assert.deepEqual(sections.map(s=>s.controls.animation),['none','reveal','none','reveal','reveal','reveal','reveal','reveal']);assert.equal(proposal.missingMedia.length,0);assert.equal(proposal.readyToApply,false);assert.equal(proposal.mode,'review-only');
 const allStrings=value=>typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(allStrings):[];
 const desktop=inventory.views.find(v=>v.width===1280),mobile=inventory.views.find(v=>v.width===390);
 for(let i=0;i<8;i++){
  const source=desktop.content[i],values=allStrings(sections[i].data);
  for(const text of [...source.paragraphs,...source.quotes,...source.figures])assert.ok(values.includes(text),`Missing source text: ${text}`);
  for(const heading of source.headings)for(const line of heading.lines)for(const run of line.runs)assert.ok(values.includes(run.text),`Missing heading run: ${run.text}`);
  for(const image of source.images){assert.ok(values.includes(image.alt));assert.ok(values.includes(bindings.find(b=>b.sourcePath===image.sourcePath).assetId));}
 }
 assert.deepEqual(sections[0].data.heading.lines,desktop.content[0].headings[0].lines);
 assert.equal(sections[0].data.button.href,'/plan?guided=true');assert.equal(sections[0].data.scrollCue.anchor,'#guided-introduction');assert.equal(sections[1].controls.anchor,'guided-introduction');
 assert.equal(sections[0].data.media.desktopFraming.x,58);assert.equal(sections[0].data.media.mobileFraming.x,61);
 assert.equal(sections[0].data.media.mobileFraming.x,Number(mobile.content[0].images[0].objectPosition.split('%')[0]));
 assert.deepEqual(sections[5].data.button,{enabled:false,link:{label:'Meet our specialists',href:'/specialists',newWindow:false}});
 assert.equal(sections[6].data.items[0].action.label,'Explore journeys');assert.equal(sections[6].data.items[1].eyebrow,'Begin with a place');
 assert.equal(sections[7].data.initialOpenId,sections[7].data.items[0].id);
 assert.deepEqual(sections[7].data.items.map(({question,answer})=>({question,answer})),desktop.content[7].faq.map(({question,answer})=>({question,answer})));
 assert.deepEqual(inventory,original);assert.deepEqual(proof,guidedMigrationDependencies);
 const id='00000000-0000-4000-8000-000000000001';assert.equal(projectGuidedSafarisPage({recordId:id,revisionId:id,type:'page',payload:proposal.previewPayload},{locale:'en',now:new Date('2026-10-23')}).sections.length,8);
});
test('Bespoke migration binds source hashes and processed image identity without granting apply authority',()=>{
 const unmapped=planGuidedSafarisMigration(proof);assert.equal(unmapped.missingMedia.length,8);assert.ok(unmapped.findings.some(f=>f.code==='media_unmapped'));
 for(const changed of [proof.slice(1),[...proof,proof[0]],proof.map((p,i)=>i===0?{...p,sha256:'0'.repeat(64)}:p)])assert.throws(()=>planGuidedSafarisMigration(changed,bindings));
 for(const changed of [[...bindings,bindings[0]],bindings.map((b,i)=>i===0?{...b,sourceSha256:'0'.repeat(64)}:b),bindings.map((b,i)=>i===0?{...b,assetId:bindings[1].assetId}:b),[{...bindings[0],assetId:'review-only-fake'}],[{...bindings[0],sourcePath:'/assets/unknown.jpg'}]])assert.throws(()=>planGuidedSafarisMigration(proof,changed));
 const mapped=planGuidedSafarisMigration(proof,bindings);assert.equal(mapped.readyToApply,false);assert.ok(mapped.findings.some(f=>f.code==='provider_unverified'));assert.ok(mapped.findings.some(f=>f.code==='delivery_pending'));
});
test('Bespoke migration retains sharing metadata and reuses the original social image binding',()=>{
 const result=planGuidedSafarisMigration(proof,bindings),seo=result.previewPayload.seo;
 assert.deepEqual(result.metadata,inventory.metadata);assert.equal(seo.canonical,inventory.metadata.canonical);assert.equal(seo.description,inventory.metadata.description);
 assert.equal(seo.socialImage.assetId,bindings.find(b=>b.sourcePath===new URL(inventory.metadata.ogImage).pathname).assetId);
 assert.equal(seo.socialTitle,inventory.metadata.openGraph.find(m=>m.property==='og:title').content);
 assert.equal(seo.socialImage.alt,inventory.metadata.openGraph.find(m=>m.property==='og:image:alt').content);
});
