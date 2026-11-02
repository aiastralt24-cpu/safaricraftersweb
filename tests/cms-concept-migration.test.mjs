import test from 'node:test';
import assert from 'node:assert/strict';
import capture from '../docs/cms/concept-migration-inventory.json' with {type:'json'};
import {planConceptMigration} from '../lib/cms/concept-migration.ts';
import {conceptMigrationDependencies as proof,conceptMigrationMedia as media,conceptMigrationRecords as records,conceptCaptureDigest} from '../lib/cms/concept-migration-review.ts';
import {projectConceptPage} from '../lib/cms/concept-page.ts';
const bindings=()=>({captureDigest:conceptCaptureDigest,media:media.map((s,i)=>({sourcePath:s.sourcePath,sourceSha256:s.sha256,assetId:`mapped-${i}`})),records:records.map((s,i)=>({sourceKey:s.sourceKey,recordId:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}))});
test('Concept migration requires explicit complete mappings and never grants apply authority',()=>{
 const pending=planConceptMigration(proof);assert.equal(pending.path,'/concept');assert.equal(pending.previewPayload,null);assert.ok(pending.missingMedia.length);assert.ok(pending.missingRecords.length);
 const result=planConceptMigration(proof,bindings());assert.equal(result.readyToApply,false);assert.equal(result.mode,'review-only');assert.deepEqual(result.previewPayload.composition.sections.map(s=>s.controls.label),capture.content.map(s=>s.navLabel));
 assert.ok(result.previewPayload.composition.sections.every(s=>s.id.startsWith('concept-')));assert.equal(result.previewPayload.navigation.primary.length,6);
 const page=projectConceptPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload:result.previewPayload},{locale:'en',now:new Date()});assert.equal(page.path,'/concept');assert.equal(page.sections.length,10);
 assert.equal(result.previewPayload.seo.canonical,capture.metadata.canonical);assert.ok(result.findings.some(f=>f.code==='canonical_review'));
});
test('Concept source copy, hero frames, quotations and responsive media survive mapping',()=>{
 const result=planConceptMigration(proof,bindings()),sections=result.previewPayload.composition.sections;
 const get=kind=>sections.find(s=>s.kind===kind).data;
 assert.equal(get('homepageHero').frames.length,capture.heroFrames.length);
 assert.equal(get('homepageStory').copy,capture.content.find(s=>s.navLabel==='Our story').paragraphs[1].text);
 assert.deepEqual(get('homepageStory').statistics.map(s=>s.value),[75,24,6000,450]);assert.ok(get('homepageStory').statistics.every(s=>s.source===''));
 assert.equal(get('homepagePartners').regions.length,3);assert.equal(get('homepageGuestNotes').items.length,6);
 assert.equal(records.filter(r=>r.type==='testimonial').length,6);assert.ok(records.filter(r=>r.type==='testimonial').every(r=>r.evidence.quote.trim()));
 const hero=get('homepageHero');assert.equal(hero.background.kind,'video');assert.notEqual(hero.background.desktopAssetId,hero.background.mobileAssetId);
 result.previewPayload.navigation.primary[0].label='Changed';assert.notEqual(planConceptMigration(proof,bindings()).previewPayload.navigation.primary[0].label,'Changed');
});
test('stale capture/source and unknown or duplicate mapping identities are rejected',()=>{
 const stale=bindings();stale.captureDigest='0'.repeat(64);assert.throws(()=>planConceptMigration(proof,stale),/older/);
 assert.throws(()=>planConceptMigration(proof.slice(1),bindings()),/changed/);
 const badHash=structuredClone(proof);badHash[0].sha256='0'.repeat(64);assert.throws(()=>planConceptMigration(badHash,bindings()),/changed/);
 for(const change of [m=>m.media[0].sourceSha256='0'.repeat(64),m=>m.media[1].assetId=m.media[0].assetId,m=>m.records[1].recordId=m.records[0].recordId,m=>m.records[0].sourceKey='unknown']){const m=bindings();change(m);assert.throws(()=>planConceptMigration(proof,m));}
});
