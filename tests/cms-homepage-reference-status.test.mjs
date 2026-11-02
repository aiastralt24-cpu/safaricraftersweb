import test from 'node:test';import assert from 'node:assert/strict';
import {homepageReferenceFindings,homepageReferenceStatusSchema} from '../lib/cms/homepage-reference-status.ts';
import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';import {makeHomepageMigrationFixture} from './fixtures/cms-homepage-migration.mjs';
const now=new Date('2026-10-23T00:00:00Z'),revisionId='00000000-0000-4000-8000-000000000001';
function fixture(){const record={type:'homepage',path:'/',locale:'en',payload:structuredClone(planHomepageMigration(homepageMigrationDependencies,makeHomepageMigrationFixture().mappings).previewPayload)};const evidence=record.payload.composition.sections.flatMap(s=>s.kind==='homepageJourneys'?s.data.items.map(i=>({...i,type:'journey'})):s.kind==='homepageGuestNotes'?s.data.items.map(i=>({...i,type:'testimonial'})):s.kind==='homepageDepartures'?s.data.overrides.map(i=>({...i,type:'photoExpedition'})):[]).map(({recordId,type})=>({recordId,type,available:true,locale:'en',revisionId}));return {record,evidence};}
test('homepage selected records need exact available published evidence of the expected type',()=>{
 const {record,evidence}=fixture();assert.equal(homepageReferenceFindings(record,evidence,now).length,0);assert.equal(homepageReferenceFindings(record,undefined,now).length,evidence.length);
 const row=evidence[0];for(const bad of [{...row,type:'testimonial'},{recordId:row.recordId,available:false}])assert.equal(homepageReferenceFindings(record,[bad,...evidence.slice(1)],now).length,1);
 assert.equal(homepageReferenceFindings(record,[...evidence,row],now).length,1);assert.equal(homepageReferenceStatusSchema.safeParse([{...row,consent:'private'}]).success,false);
});
test('future configured sections require references while hidden and expired sections do not',()=>{
 const {record}=fixture();record.payload.composition.sections.forEach(s=>s.controls.visible=false);const section=record.payload.composition.sections.find(s=>s.kind==='homepageJourneys');section.controls.visible=true;section.controls.visibleFrom='2027-01-01T00:00:00Z';assert.equal(homepageReferenceFindings(record,[],now).length,section.data.items.length);
 section.controls.visibleFrom=undefined;section.controls.visibleUntil='2026-01-01T00:00:00Z';assert.equal(homepageReferenceFindings(record,[],now).length,0);
});
test('direct and queue workers use trusted reference evidence and reject otherwise incomplete homepage content',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts'),{runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');const {record,evidence}=fixture(),target={site:revisionId,record:revisionId,revision:revisionId};
 for(const queue of [false,true]){
  let receipt;const input={...target,...record,homepageStatus:evidence};
  if(queue)await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [{...target,id:revisionId,token:revisionId}];if(name==='get_validation_job_input')return input;receipt=args;});
  else await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;receipt=args;},target);
  assert.equal(receipt.p_findings.some(f=>f.code==='homepage_reference_unavailable'),false);assert.equal(receipt.p_valid,false);
 }
});
