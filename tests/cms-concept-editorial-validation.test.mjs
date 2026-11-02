import test from 'node:test';import assert from 'node:assert/strict';import {conceptEditorialFindings} from '../lib/cms/concept-editorial-validation.ts';import {planConceptMigration} from '../lib/cms/concept-migration.ts';import {conceptMigrationDependencies} from '../lib/cms/concept-migration-review.ts';import {makeConceptMigrationFixture} from './fixtures/cms-concept-migration.mjs';
const now=new Date('2026-10-23T00:00:00Z');function fixture(){return {type:'page',path:'/concept',locale:'en',payload:structuredClone(planConceptMigration(conceptMigrationDependencies,makeConceptMigrationFixture().mappings).previewPayload)};}
test('unsupported Concept identity and missing private statistic evidence produce precise findings',()=>{
 const record=fixture(),findings=conceptEditorialFindings(record,[],now);assert.equal(findings.filter(f=>f.code==='statistic_source_required').length,4);
 const story=record.payload.composition.sections.find(s=>s.kind==='homepageStory');story.data.statistics.forEach(stat=>stat.source='PRIVATE_SUPPORT');assert.equal(conceptEditorialFindings(record,[],now).some(f=>f.code==='statistic_source_required'),false);assert.equal(JSON.stringify(conceptEditorialFindings(record,[],now)).includes('PRIVATE_SUPPORT'),false);
 assert.equal(conceptEditorialFindings({...record,path:'/home'},[],now)[0].code,'concept_identity');
});
test('local anchors must remain visible throughout their linking section schedule',()=>{
 const record=fixture(),story=record.payload.composition.sections.find(s=>s.kind==='homepageStory'),target=record.payload.composition.sections.find(s=>s.kind==='homepageConcierge');target.controls.anchor='planning';story.data.button.href='#planning';
 const field=`composition.sections.${record.payload.composition.sections.indexOf(story)}.data.button.href`;
 assert.equal(conceptEditorialFindings(record,[],now).some(f=>f.field===field),false);
 target.controls.visibleUntil='2027-01-01T00:00:00Z';assert.equal(conceptEditorialFindings(record,[],now).filter(f=>f.field===field).length,1);
 story.controls.visibleUntil='2027-01-01T00:00:00Z';assert.equal(conceptEditorialFindings(record,[],now).some(f=>f.field===field),false);
});
test('dynamic links require exact trusted published-path evidence and hidden claims do not block',()=>{
 const record=fixture(),story=record.payload.composition.sections.find(s=>s.kind==='homepageStory');story.data.button.href='/journeys/verified-only';const field=`composition.sections.${record.payload.composition.sections.indexOf(story)}.data.button.href`;
 assert.ok(conceptEditorialFindings(record,[],now).some(f=>f.field===field));assert.equal(conceptEditorialFindings(record,['/journeys/verified-only'],now).some(f=>f.field===field),false);
 story.controls.visible=false;assert.equal(conceptEditorialFindings(record,[],now).some(f=>f.code==='statistic_source_required'||f.field===field),false);
});
test('both trusted workers forward database link evidence without accepting incomplete homepage content',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');
 const id='00000000-0000-4000-8000-000000000001',target={site:id,record:id,revision:id},record=fixture();record.payload.composition.sections.find(s=>s.kind==='homepageStory').data.button.href='/journeys/worker-proof';
 for(const queue of [false,true])for(const available of [false,true]){
  let receipt;const input={...target,...record,conceptPublishedPaths:available?['/journeys/worker-proof']:[]};
  if(queue)await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [{...target,id,token:id}];if(name==='get_validation_job_input')return input;receipt=args;});
  else await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;receipt=args;},target);
  assert.equal(receipt.p_findings.some(f=>f.code==='concept_link_unverified'&&f.field.endsWith('.button.href')), !available);
  assert.equal(receipt.p_valid,false);assert.equal(receipt.p_version,'composition-5');
 }
});
