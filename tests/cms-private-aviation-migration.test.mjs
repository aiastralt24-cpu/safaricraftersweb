import test from 'node:test';import assert from 'node:assert/strict';
import {planPrivateAviationMigration,aviationMigrationDependencies} from '../lib/cms/private-aviation-migration.ts';
import {projectPrivateAviationPage} from '../lib/cms/private-aviation-page.ts';
import inventory from '../docs/cms/private-aviation-migration-inventory.json' with {type:'json'};
const bindings=()=>inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:'processed-'+i}));
test('Aviation migration preserves all rendered text, heading lines, specs and media roles',()=>{
 const maps=bindings(),before=structuredClone(maps),proposal=planPrivateAviationMigration(aviationMigrationDependencies,maps);assert.deepEqual(maps,before);assert.equal(proposal.readyToApply,false);assert.deepEqual(proposal.missingMedia,[]);
 const sections=proposal.previewPayload.composition.sections,source=inventory.views[0].content;
 for(let i=0;i<5;i++){assert.deepEqual(sections[i].data.heading.lines,source[i].headings[0].lines);const text=JSON.stringify(sections[i].data);for(const p of source[i].paragraphs)assert.ok(text.includes(JSON.stringify(p).slice(1,-1)),p);for(const h of source[i].headings.slice(1))assert.ok(text.includes(JSON.stringify(h.text).slice(1,-1)),h.text);}
 assert.equal(sections[0].data.media.poster.decorative,true);assert.equal(sections[0].data.media.poster.alt,'');assert.equal(sections[0].data.media.background.desktopAssetId,maps.find(m=>m.sourcePath.endsWith('.mp4')).assetId);assert.equal(sections[0].data.captions.secondary,'India · By arrangement');assert.equal(sections[0].data.captions.showSecondaryOnMobile,false);
 for(const i of [0,1])assert.equal(sections[i].data.button.href,'/plan?experience=private-aviation');
 const fleet=sections[2].data.aircraft;for(let i=0;i<fleet.length;i++){assert.deepEqual(fleet[i].specifications.map(({label,value})=>({label,value})),source[2].aircraft[i].specifications);assert.equal(fleet[i].media.image.alt,source[2].images[i].alt);}
 const id='11111111-1111-4111-8111-111111111111';assert.equal(projectPrivateAviationPage({recordId:id,revisionId:id,type:'page',payload:proposal.previewPayload},{locale:'en',now:new Date('2026-10-23')}).sections.length,5);
 assert.equal(proposal.metadataChanges[0].before,'https://safaricrafters.com/');assert.equal(proposal.previewPayload.seo.canonical,'https://safaricrafters.com/private-aviation');assert.equal(proposal.previewPayload.seo.socialImage,undefined);assert.equal(proposal.metadataChanges[1].proposed,'inherit');
});
test('Aviation migration fails closed on stale source, conflicting bindings and private fields',()=>{
 for(const proof of [aviationMigrationDependencies.slice(1),[...aviationMigrationDependencies,aviationMigrationDependencies[0]],aviationMigrationDependencies.map((p,i)=>i? p:{...p,sha256:'0'.repeat(64)})])assert.throws(()=>planPrivateAviationMigration(proof));
 const maps=bindings();for(const bad of [[...maps,maps[0]],maps.map((m,i)=>i?m:{...m,sourceSha256:'0'.repeat(64)}),maps.map((m,i)=>i?m:{...m,sourcePath:'/unknown.png'}),maps.map((m,i)=>i?m:{...m,assetId:'review-only-forged'}),maps.map(m=>({...m,assetId:'same-asset'})),maps.map((m,i)=>i?m:{...m,approved:true})])assert.throws(()=>planPrivateAviationMigration(aviationMigrationDependencies,bad));
});
test('Aviation unmapped proposal is explicit review-only and never gains apply authority',()=>{
 const p=planPrivateAviationMigration(aviationMigrationDependencies);assert.equal(p.missingMedia.length,5);assert.ok(JSON.stringify(p.previewPayload).includes('review-only-aviation-'));assert.ok(p.findings.some(f=>f.code==='media_unmapped'));assert.equal(p.readyToApply,false);
 const complete=planPrivateAviationMigration(aviationMigrationDependencies,bindings());assert.equal(complete.readyToApply,false);for(const code of ['provider_unverified','claims_review','presentation_pending','metadata_review','delivery_pending'])assert.ok(complete.findings.some(f=>f.code===code));
});
