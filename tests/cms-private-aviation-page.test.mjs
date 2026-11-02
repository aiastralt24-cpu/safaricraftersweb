import test from 'node:test';import assert from 'node:assert/strict';
import {createAviationSection,createAviationPageDraft} from '../lib/cms/private-aviation-section-drafts.ts';
import {aviationSectionKinds} from '../lib/cms/private-aviation-content.ts';
import {validateComposition,editCompositionDraft} from '../lib/cms/composition.ts';
import {projectPrivateAviationPage} from '../lib/cms/private-aviation-page.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const uuid='11111111-1111-4111-8111-111111111111',now=new Date('2026-10-23');
function fixture(){const section=createAviationSection('aviationHero','hero');section.data={eyebrow:'Private aviation',heading:{lines:[{runs:[{text:'Private flight.',emphasis:false}]},{runs:[{text:'Wild arrival.',emphasis:true}]}]},copy:'A considered route.',button:{label:'Plan a journey',href:'/plan?experience=private-aviation',newWindow:false},media:{poster:{assetId:'poster',alt:'Aircraft arriving',decorative:false},background:{kind:'video',desktopAssetId:'video'},desktopFraming:{x:50,y:50,shape:'panorama'},mobileFraming:{x:50,y:50,shape:'landscape'}},captions:{primary:'Private aviation',secondary:'India · By arrangement',showSecondaryOnMobile:false}};return {recordId:uuid,revisionId:uuid,type:'page',payload:{composition:{schemaVersion:1,title:'Private Aviation',sections:[section]}}};}
test('Aviation registered drafts stay incomplete without inventing claims or media',()=>{
 const draft=createAviationPageDraft();assert.equal(draft.path,'/private-aviation');assert.deepEqual(draft.composition.sections,[]);
 for(const kind of aviationSectionKinds){const section=createAviationSection(kind,'section');const checked=validateComposition({...draft.composition,sections:[section]});assert.equal(checked.valid,false);assert.ok(!checked.issues.some(i=>i.path.endsWith('.kind')));}
 assert.throws(()=>createAviationSection('aviationHero','invalid identity'));const first=createAviationSection('aviationFleet','fleet');first.data.aircraft[0].name='Changed';assert.equal(createAviationSection('aviationFleet','fleet').data.aircraft[0].name,'');
});
test('Aviation projection preserves current data and hides copied or scheduled sections',()=>{
 const value=fixture(),before=structuredClone(value);assert.equal(validateComposition(value.payload.composition).valid,true);const projected=projectPrivateAviationPage(value,{locale:'en',now});assert.equal(projected.path,'/private-aviation');assert.deepEqual(projected.sections[0].data,value.payload.composition.sections[0].data);assert.deepEqual(value,before);
 value.payload.composition=editCompositionDraft(validateComposition(value.payload.composition).page,{type:'duplicate',id:'hero',newId:'hidden-copy'});assert.equal(projectPrivateAviationPage(value,{locale:'en',now}).sections.length,1);
 const section=createAviationSection('aviationServices','future');section.data={eyebrow:'Services',heading:{lines:[{runs:[{text:'Air access',emphasis:false}]}]},introduction:'Travel with care.',items:[{id:'one',title:'Planning',copy:'Coordinate the route.'}]};section.controls.visibleFrom='2026-10-24T00:00:00.000Z';value.payload.composition.sections.push(section);assert.equal(projectPrivateAviationPage(value,{locale:'en',now}).sections.length,1);assert.equal(projectPrivateAviationPage(value,{locale:'en',now:new Date('2026-10-25')}).sections.length,2);
});
test('Aviation projection rejects unsafe page contexts, private fields and scheduled loss of its H1',()=>{
 assert.throws(()=>projectPrivateAviationPage(fixture(),{locale:'fr',now}));assert.throws(()=>projectPrivateAviationPage(fixture(),{locale:'en',now:new Date('invalid')}));
 let value=fixture();value.payload.privateNotes='private';assert.throws(()=>projectPrivateAviationPage(value,{locale:'en',now}));
 value=fixture();value.payload.composition.sections[0].controls.visibleUntil='2026-10-24T00:00:00.000Z';assert.throws(()=>projectPrivateAviationPage(value,{locale:'en',now}));
 value=fixture();value.payload.composition.sections[0].controls.regions=['india'];assert.throws(()=>projectPrivateAviationPage(value,{locale:'en',now}));
 value=fixture();value.payload.composition.sections.push({id:'other',kind:'text',controls:{label:'Unsupported'},data:{body:[]}});assert.throws(()=>projectPrivateAviationPage(value,{locale:'en',now}));
 const result=validateStoredContent({type:'page',path:'/private-aviation',locale:'en',payload:fixture().payload});assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='asset_verification_required'));assert.ok(result.findings.some(f=>f.code==='video_verification_required'));
});

import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
test('Aviation template exposes only its dedicated palette and begins without source claims',()=>{
 const draft=createPageTemplate('aviation');assert.equal(draft.path,'/private-aviation');assert.deepEqual(draft.composition.sections,[]);assert.deepEqual(pageSectionOptions('page',draft.path),aviationSectionKinds);assert.ok(!pageSectionOptions('page','/guided-bespoke-safaris').includes('aviationHero'));assert.ok(!pageSectionOptions('homepage','/').includes('aviationHero'));
});
