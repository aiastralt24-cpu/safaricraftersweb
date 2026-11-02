import test from 'node:test';import assert from 'node:assert/strict';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {planConceptMigration} from '../lib/cms/concept-migration.ts';
import {conceptMigrationDependencies} from '../lib/cms/concept-migration-review.ts';
import {makeConceptMigrationFixture,revision} from './fixtures/cms-concept-migration.mjs';
test('Concept validation requires exact eligible references including future sections without accepting incomplete content',()=>{
 const f=makeConceptMigrationFixture(),payload=planConceptMigration(conceptMigrationDependencies,f.mappings).previewPayload;
 const record={type:'page',path:'/concept',locale:'en',payload};
 const evidence=f.records.map(r=>({recordId:r.id,available:true,type:r.type,locale:'en',revisionId:revision}));
 const check=rows=>validateStoredContent({...record,conceptStatus:rows});
 assert.equal(check(evidence).findings.some(f=>f.code==='concept_reference_unavailable'),false);
 assert.equal(check(evidence).contentChecksPass,false);
 assert.ok(check(undefined).findings.some(f=>f.code==='concept_reference_unavailable'));
 const guests=payload.composition.sections.find(s=>s.kind==='homepageGuestNotes');guests.controls.visibleFrom='2099-01-01T00:00:00Z';
 const guestId=guests.data.items[0].recordId;
 for(const rows of [evidence.filter(r=>r.recordId!==guestId),[...evidence,evidence.find(r=>r.recordId===guestId)],evidence.map(r=>r.recordId===guestId?{...r,type:'journey'}:r)])assert.ok(check(rows).findings.some(f=>f.code==='concept_reference_unavailable'));
 guests.controls.visible=false;assert.equal(check(evidence.filter(r=>r.recordId!==guestId)).findings.some(f=>f.code==='concept_reference_unavailable'),false);
});
