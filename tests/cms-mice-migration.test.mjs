import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/mice-migration-inventory.json' with {type:'json'};
import {miceMigrationDependencies,planMiceMigration} from '../lib/cms/mice-migration.ts';
import {projectMicePage} from '../lib/cms/mice-page.ts';
const id='00000000-0000-4000-8000-000000000001';
test('MICE inventory remains bound to original source, media, responsive content and corporate form',async()=>{
 for(const item of miceMigrationDependencies)assert.equal(createHash('sha256').update(await readFile(new URL('../'+item.sourcePath,import.meta.url))).digest('hex'),item.sha256,item.sourcePath);
 assert.deepEqual(inventory.views.map(v=>v.width),[1280,390]);assert.ok(inventory.views.every(v=>v.h1Count===1&&!v.overflow));assert.deepEqual(inventory.views[0].data,inventory.views[1].data);
 const plan=planMiceMigration(miceMigrationDependencies);assert.equal(plan.readyToApply,false);assert.equal(plan.missingMedia.length,2);assert.equal(plan.formId,null);assert.equal(plan.legacyForm.fields.length,7);
 assert.equal(plan.previewPayload.composition.sections[5].data.formNote,plan.legacyForm.note);
 assert.deepEqual(plan.previewPayload.composition.sections[0].data.heading,inventory.views[0].data[0].heading);
 assert.equal(plan.previewPayload.composition.sections[3].data.items[1].button.label,'Plan an international journey ↗');
});
test('MICE proposal binds exact source assets and supplied form without granting apply authority',()=>{
 const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`approved-${i}`})),plan=planMiceMigration(miceMigrationDependencies,bindings,id);
 assert.equal(plan.missingMedia.length,0);assert.equal(plan.readyToApply,false);
 assert.equal(plan.previewPayload.composition.sections[0].data.image.assetId,plan.previewPayload.composition.sections[3].data.items[0].image.assetId);
 assert.deepEqual(projectMicePage({recordId:id,revisionId:id,type:'page',payload:plan.previewPayload},{locale:'en',now:new Date('2026-10-23T00:00:00Z')}).requiredFormIds,[id]);
 assert.throws(()=>planMiceMigration(miceMigrationDependencies.slice(1)),/source changed/);
 assert.throws(()=>planMiceMigration([...miceMigrationDependencies,miceMigrationDependencies[0]]),/source changed/);
 assert.throws(()=>planMiceMigration(miceMigrationDependencies,[bindings[0],bindings[0]]),/Duplicate/);
 assert.throws(()=>planMiceMigration(miceMigrationDependencies,[{...bindings[0],sourceSha256:'0'.repeat(64)}]),/stale/);
 assert.throws(()=>planMiceMigration(miceMigrationDependencies,bindings.map(b=>({...b,assetId:'same'}))),/distinct/);
 assert.throws(()=>planMiceMigration(miceMigrationDependencies,[], 'bad'));
});
