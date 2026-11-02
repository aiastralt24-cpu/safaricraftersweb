import test from 'node:test';import assert from 'node:assert/strict';
import {projectHomepageSections,homepageSectionKinds} from '../lib/cms/homepage-projection.ts';
import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';import {makeHomepageMigrationFixture,site,revision} from './fixtures/cms-homepage-migration.mjs';
const context={locale:'en',now:new Date('2026-10-23T00:00:00Z')};
function fixture(){return {recordId:site,revisionId:revision,type:'homepage',payload:structuredClone(planHomepageMigration(homepageMigrationDependencies,makeHomepageMigrationFixture().mappings).previewPayload)};}
test('homepage projection preserves ten ordered families and excludes internal statistic sources without mutating drafts',()=>{
 const input=fixture(),story=input.payload.composition.sections.find(s=>s.kind==='homepageStory');story.data.statistics[0].source='PRIVATE_STATISTIC_EVIDENCE';
 const result=projectHomepageSections(input,context);assert.deepEqual(result.sections.map(s=>s.kind),homepageSectionKinds.filter(kind=>kind!=='downloads'));assert.equal(result.path,'/');assert.equal(JSON.stringify(result).includes('PRIVATE_STATISTIC_EVIDENCE'),false);assert.equal('source' in result.sections[1].data.statistics[0],false);assert.equal(story.data.statistics[0].source,'PRIVATE_STATISTIC_EVIDENCE');assert.equal(result.sections[0].data.frames.length,5);
});
test('homepage projection honors visibility, locale and schedules while preserving the rest of the order',()=>{
 const input=fixture(),sections=input.payload.composition.sections;
 sections[1].controls.visible=false;sections[2].controls.locales=['fr'];sections[3].controls.visibleFrom='2027-01-01T00:00:00Z';sections[4].controls.visibleUntil='2026-10-23T00:00:00Z';
 const result=projectHomepageSections(input,context);assert.equal(result.sections.length,6);assert.equal(result.sections[0].kind,'homepageHero');assert.equal(result.sections[1].kind,'homepageCorporate');
});
test('unsupported envelopes, region targeting and missing future hero fail closed',()=>{
 for(const change of [v=>v.payload.composition.sections[0].controls.visible=false,v=>v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z',v=>v.payload.composition.sections[1].controls.regions=['india'],v=>v.type='page',v=>v.payload.privateEvidence='secret']){const input=fixture();change(input);assert.throws(()=>projectHomepageSections(input,context));}
 assert.throws(()=>projectHomepageSections(fixture(),{...context,locale:'fr'}));assert.throws(()=>projectHomepageSections(fixture(),{...context,now:new Date('invalid')}));
});

test('homepage downloads retain reviewed revisions, scheduling and required hero semantics',()=>{
 const input=fixture(),download={id:'resources',kind:'downloads',controls:{label:'Documents',headingLevel:'h2'},data:{title:'Travel documents',items:[{id:'guide',label:'Travel guide',document:{recordId:site},versionId:revision}]}};
 input.payload.composition.sections.push(download);
 const result=projectHomepageSections(input,context);assert.deepEqual(result.sections.at(-1).data,download.data);
 download.controls.visibleFrom='2027-01-01T00:00:00Z';assert.equal(projectHomepageSections(input,context).sections.some(s=>s.id==='resources'),false);
 delete download.controls.visibleFrom;
 for(const change of [v=>v.controls.headingLevel='h1',v=>v.data.title=' ',v=>v.data.items[0].label=' ',v=>v.controls.regions=['india']]){const copy=structuredClone(input);change(copy.payload.composition.sections.at(-1));assert.throws(()=>projectHomepageSections(copy,context));}
});
