import test from 'node:test';import assert from 'node:assert/strict';
import {projectGuidedSafarisPage} from '../lib/cms/guided-safaris-page.ts';
import {createGuidedSection,createGuidedPageDraft} from '../lib/cms/guided-safaris-section-drafts.ts';
import {guidedSectionKinds} from '../lib/cms/guided-safaris-content.ts';
import {validateComposition} from '../lib/cms/composition.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const id='00000000-0000-4000-8000-000000000001',now=new Date('2026-10-23'),heading={lines:[{runs:[{text:'Read the field',emphasis:false}]}]},media={image:{assetId:'forest',alt:'Forest',decorative:false},desktopFraming:{x:50,y:50,shape:'wide'},mobileFraming:{x:30,y:50,shape:'portrait'}};
function fixture(){return {recordId:id,revisionId:id,type:'page',payload:{composition:{schemaVersion:1,title:'Bespoke Safaris',sections:[{id:'hero',kind:'guidedHero',controls:{label:'Hero',headingLevel:'h1'},data:{eyebrow:'Bespoke',heading,copy:'Travel with a guide.',media,button:{label:'Plan with a guide',href:'/plan?guided=true',newWindow:false},scrollCue:{label:'Into the field',accessibleLabel:'Continue to introduction',anchor:'#introduction'}}},{id:'intro',kind:'guidedIntroduction',controls:{label:'Introduction',anchor:'introduction'},data:{eyebrow:'In the field',heading,paragraphs:[{id:'paragraph',text:'Original source copy.'}]}}]}}};}
test('Bespoke sections register as deliberately incomplete drafts without inventing media or source copy',()=>{
 const draft=createGuidedPageDraft();assert.equal(draft.path,'/guided-bespoke-safaris');assert.equal(draft.composition.sections.length,0);
 for(const kind of guidedSectionKinds){const section=createGuidedSection(kind,'section');assert.equal(section.kind,kind);const checked=validateComposition({...draft.composition,sections:[section]});assert.equal(checked.valid,false);assert.ok(!checked.issues.some(i=>i.path.endsWith('.kind')));}
 assert.throws(()=>createGuidedSection('guidedHero','invalid id'));
});
test('Bespoke projection preserves reviewed content and remains separate from publication authorization',()=>{
 const input=fixture(),before=structuredClone(input),page=projectGuidedSafarisPage(input,{locale:'en',now});assert.equal(page.path,'/guided-bespoke-safaris');assert.equal(page.sections.length,2);assert.equal(page.sections[0].data.button.href,'/plan?guided=true');assert.deepEqual(input,before);
 const result=validateStoredContent({type:'page',path:page.path,locale:'en',payload:input.payload},[{assetId:'forest',available:true}]);assert.equal(result.contentChecksPass,true);assert.deepEqual(result.findings,[]);
});
test('Bespoke requires safe scheduled heading and scroll-target visibility and exact page identity',()=>{
 for(const change of [v=>v.type='homepage',v=>v.payload.extra='private',v=>v.payload.composition.sections[0].controls.visible=false,v=>v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z',v=>v.payload.composition.sections[1].controls.visibleUntil='2027-01-01T00:00:00Z',v=>v.payload.composition.sections[1].controls.regions=['india'],v=>v.payload.composition.sections[1].kind='text']){const input=fixture();change(input);assert.throws(()=>projectGuidedSafarisPage(input,{locale:'en',now}));}
 assert.throws(()=>projectGuidedSafarisPage(fixture(),{locale:'fr',now}));assert.throws(()=>projectGuidedSafarisPage(fixture(),{locale:'en',now:new Date('invalid')}));
});

import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
test('Bespoke authoring starts empty with its own explicit palette and keeps other routes isolated',()=>{const draft=createPageTemplate('guided');assert.equal(draft.path,'/guided-bespoke-safaris');assert.equal(draft.composition.sections.length,0);assert.deepEqual(pageSectionOptions('page',draft.path),guidedSectionKinds);assert.ok(!pageSectionOptions('page','/concept').includes('guidedHero'));});
