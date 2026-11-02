import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition,editCompositionDraft} from '../lib/cms/composition.ts';
import {createConservationSection} from '../lib/cms/conservation-section-drafts.ts';
import {conservationSectionKinds} from '../lib/cms/conservation-content.ts';
import {conservationMigrationDependencies,planConservationMigration} from '../lib/cms/conservation-migration.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {createPageTemplate} from '../lib/cms/page-templates.ts';
test('conservation migration yields five registered sections without enabling application',()=>{
 const plan=planConservationMigration(conservationMigrationDependencies),page=plan.previewPayload.composition;assert.equal(validateComposition(page).valid,true);assert.deepEqual(page.sections.map(s=>s.kind),conservationSectionKinds);assert.equal(plan.readyToApply,false);assert.equal(page.sections[0].controls.headingLevel,'h1');assert.equal(page.sections[3].controls.background,'forest');assert.equal(page.sections[3].controls.mediaAlign,'start');assert.equal(page.sections[3].controls.mobileOrder,'mediaFirst');assert.equal(plan.previewPayload.seo.socialTitle,plan.metadata.openGraph.title);
 const copy=editCompositionDraft(page,{type:'duplicate',id:page.sections[2].id,newId:'copy'});assert.equal(copy.sections.find(s=>s.id==='copy').controls.visible,false);assert.equal(page.sections.length,5);
});
test('conservation authoring has a route-specific palette and explicit incomplete media/source drafts',()=>{
 assert.deepEqual(pageSectionOptions('page','/conservation-commitment'),conservationSectionKinds);assert.equal(pageSectionOptions('page','/about').some(k=>k.startsWith('conservation')),false);
 assert.deepEqual(createPageTemplate('conservation').composition.sections,[]);
 for(const kind of conservationSectionKinds){const section=createConservationSection(kind,'section','item'),result=validateComposition({schemaVersion:1,title:'Draft',sections:[section]});assert.equal(result.valid,['conservationIntro','conservationFootprint'].includes(kind),kind);assert.equal(section.controls.label.length>0,true);}
});
