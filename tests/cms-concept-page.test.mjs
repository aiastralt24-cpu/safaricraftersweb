import test from 'node:test';import assert from 'node:assert/strict';
import {projectConceptPage,conceptSectionKinds} from '../lib/cms/concept-page.ts';
import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';import {makeHomepageMigrationFixture,site,revision} from './fixtures/cms-homepage-migration.mjs';
const context={locale:'en',now:new Date('2026-10-23T00:00:00Z')};
function fixture(){return {recordId:site,revisionId:revision,type:'page',payload:structuredClone(planHomepageMigration(homepageMigrationDependencies,makeHomepageMigrationFixture().mappings).previewPayload)};}
test('Concept projection preserves ten ordered families and excludes internal statistic sources without mutating drafts',()=>{
 const input=fixture(),story=input.payload.composition.sections.find(s=>s.kind==='homepageStory');story.data.statistics[0].source='PRIVATE_STATISTIC_EVIDENCE';
 const result=projectConceptPage(input,context);assert.deepEqual(result.sections.map(s=>s.kind),conceptSectionKinds.filter(kind=>kind!=='downloads'));assert.equal(result.path,'/concept');assert.equal(JSON.stringify(result).includes('PRIVATE_STATISTIC_EVIDENCE'),false);assert.equal('source' in result.sections[1].data.statistics[0],false);assert.equal(story.data.statistics[0].source,'PRIVATE_STATISTIC_EVIDENCE');assert.equal(result.sections[0].data.frames.length,5);
});
test('Concept projection honors visibility, locale and schedules while preserving the rest of the order',()=>{
 const input=fixture(),sections=input.payload.composition.sections;
 sections[1].controls.visible=false;sections[2].controls.locales=['fr'];sections[3].controls.visibleFrom='2027-01-01T00:00:00Z';sections[4].controls.visibleUntil='2026-10-23T00:00:00Z';
 const result=projectConceptPage(input,context);assert.equal(result.sections.length,6);assert.equal(result.sections[0].kind,'homepageHero');assert.equal(result.sections[1].kind,'homepageCorporate');
});
test('unsupported envelopes, region targeting and missing future hero fail closed',()=>{
 for(const change of [v=>v.payload.composition.sections[0].controls.visible=false,v=>v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z',v=>v.payload.composition.sections[1].controls.regions=['india'],v=>v.type='homepage',v=>v.payload.privateEvidence='secret']){const input=fixture();change(input);assert.throws(()=>projectConceptPage(input,context));}
 assert.throws(()=>projectConceptPage(fixture(),{...context,locale:'fr'}));assert.throws(()=>projectConceptPage(fixture(),{...context,now:new Date('invalid')}));
});

test('Concept downloads retain reviewed revisions, scheduling and required hero semantics',()=>{
 const input=fixture(),download={id:'resources',kind:'downloads',controls:{label:'Documents',headingLevel:'h2'},data:{title:'Travel documents',items:[{id:'guide',label:'Travel guide',document:{recordId:site},versionId:revision}]}};
 input.payload.composition.sections.push(download);
 const result=projectConceptPage(input,context);assert.deepEqual(result.sections.at(-1).data,download.data);
 download.controls.visibleFrom='2027-01-01T00:00:00Z';assert.equal(projectConceptPage(input,context).sections.some(s=>s.id==='resources'),false);
 delete download.controls.visibleFrom;
 for(const change of [v=>v.controls.headingLevel='h1',v=>v.data.title=' ',v=>v.data.items[0].label=' ',v=>v.controls.regions=['india']]){const copy=structuredClone(input);change(copy.payload.composition.sections.at(-1));assert.throws(()=>projectConceptPage(copy,context));}
});

import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {planConceptNavigationMigration,conceptNavigationDependencies} from '../lib/cms/concept-navigation-migration.ts';
import {conceptPageFindings} from '../lib/cms/concept-page-validation.ts';
test('Concept starts as an independent incomplete page and structural success does not authorize release',()=>{
 const draft=createPageTemplate('concept');assert.equal(draft.path,'/concept');assert.equal(draft.composition.sections.length,0);assert.deepEqual(pageSectionOptions('page','/concept'),conceptSectionKinds);
 const input=fixture();input.payload.navigation=planConceptNavigationMigration(conceptNavigationDependencies).navigation;const record={type:'page',path:'/concept',locale:'en',payload:input.payload};assert.equal(conceptPageFindings(record,context.now).some(f=>f.code==='concept_page_structure'),false);assert.ok(conceptPageFindings(record,context.now).some(f=>f.code==='statistic_source_required'));assert.equal(validateStoredContent(record).contentChecksPass,false);
 assert.ok(conceptPageFindings({...record,type:'homepage'},context.now).some(f=>f.code==='concept_page_route'));assert.ok(conceptPageFindings({...record,payload:{composition:draft.composition}},context.now).some(f=>f.code==='concept_page_structure'));
});

test('Concept menu stays with the page projection and missing or malformed menus are reported',()=>{
 const input=fixture();input.payload.navigation=planConceptNavigationMigration(conceptNavigationDependencies).navigation;
 const projected=projectConceptPage(input,context);assert.deepEqual(projected.navigation,input.payload.navigation);assert.equal(projected.path,'/concept');
 const invalid=structuredClone(input);invalid.payload.navigation.primary[0].href='javascript:alert(1)';assert.throws(()=>projectConceptPage(invalid,context));
 delete input.payload.navigation;assert.equal(projectConceptPage(input,context).navigation,null);assert.ok(conceptPageFindings({type:'page',path:'/concept',locale:'en',payload:input.payload},context.now).some(f=>f.code==='concept_menu_required'));
});
