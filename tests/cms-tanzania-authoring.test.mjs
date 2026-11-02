import test from 'node:test';import assert from 'node:assert/strict';
import {tanzaniaSourceDraft} from '../lib/cms/tanzania-source-draft.ts';
import {tanzaniaContentDraft} from '../lib/cms/tanzania-page-draft.ts';
import {tanzaniaSectionKinds} from '../lib/cms/tanzania-country-sections.ts';
import {createTanzaniaSection} from '../lib/cms/tanzania-section-drafts.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {validateComposition,editCompositionDraft} from '../lib/cms/composition.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const image={assetId:'fixture-image',alt:'Field photograph',decorative:false},media={hero:image,places:Object.fromEntries(['serengeti','ngorongoro','ndutu','tarangire','lake-manyara'].map(id=>[id,image])),gallery:[image],itineraries:[image,image,image,image]};
test('Tanzania template and nine authoring groups are draft-only and preserve structured content',()=>{
 const template=createPageTemplate('tanzania');assert.equal(template.path,'/destinations/tanzania');assert.deepEqual(template.composition.sections,[]);assert.deepEqual(pageSectionOptions('page',template.path),tanzaniaSectionKinds);
 const draft=tanzaniaContentDraft(tanzaniaSourceDraft(media));assert.deepEqual(draft.composition.sections.map(section=>section.kind),tanzaniaSectionKinds);assert.equal(validateComposition(draft.composition).valid,true);
 const check=validateStoredContent({type:'page',path:template.path,locale:'en',payload:draft});assert.equal(check.contentChecksPass,false);assert.ok(check.findings.some(finding=>finding.code==='publication_not_ready'));
 const moved=editCompositionDraft(draft.composition,{type:'move',id:'tanzaniaFaq',to:1});assert.equal(moved.sections[1].id,'tanzaniaFaq');assert.equal(draft.composition.sections[1].kind,'tanzaniaFacts');
 for(const kind of tanzaniaSectionKinds){const a=createTanzaniaSection(kind,'draft-1'),b=createTanzaniaSection(kind,'draft-2');assert.equal(a.controls.label.startsWith('Tanzania'),true);assert.notEqual(a.data,b.data);assert.equal(a.controls.headingLevel,kind==='tanzaniaHero'?'h1':'h2');}
});
test('Tanzania composition blocks invalid data and foreign source layout overrides',()=>{
 const draft=tanzaniaContentDraft(tanzaniaSourceDraft(media));const invalid=structuredClone(draft.composition);invalid.sections.find(s=>s.kind==='tanzaniaPlaces').data.items[0].planner.interest='';assert.equal(validateComposition(invalid).valid,false);
 const foreign=structuredClone(draft.composition);foreign.sections[0].controls.kenyaOverrides={background:true};assert.equal(validateComposition(foreign).valid,false);
});
