import test from 'node:test';import assert from 'node:assert/strict';
import {projectMicePage} from '../lib/cms/mice-page.ts';
import {createMiceSection} from '../lib/cms/mice-section-drafts.ts';
const id='00000000-0000-4000-8000-000000000001',now=new Date('2026-10-23T00:00:00Z'),context={locale:'en',now};
function input(){const titles={eyebrow:'MICE',heading:{lines:[{runs:[{text:'Together',emphasis:false}]}]}},hero={...createMiceSection('miceHero','hero'),data:{...titles,copy:'Travel together',image:{assetId:'approved',alt:'Heritage gardens',decorative:false},focalPoint:{x:50,y:50},breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'here',label:'MICE'}]}},enquiry={...createMiceSection('miceEnquiry','enquiry'),data:{...titles,copy:'Share a brief',form:{recordId:id}}};return {recordId:id,revisionId:id,type:'page',payload:{composition:{schemaVersion:1,title:'MICE',sections:[hero,enquiry]}}};}
test('MICE projection retains revision, sections, SEO defaults and referenced form identity',()=>{const result=projectMicePage(input(),context);assert.equal(result.path,'/mice');assert.equal(result.revisionId,id);assert.deepEqual(result.requiredFormIds,[id]);assert.deepEqual(result.sections.map(s=>s.id),['hero','enquiry']);});
test('MICE projection rejects unsupported context, missing form and future loss of hero or enquiry',()=>{
 assert.throws(()=>projectMicePage(input(),{...context,locale:'fr'}),/context/);assert.throws(()=>projectMicePage(input(),{...context,now:new Date('bad')}),/context/);
 for(const index of [0,1]){const value=input();value.payload.composition.sections[index].controls.visibleUntil='2026-10-24T00:00:00Z';assert.throws(()=>projectMicePage(value,context),/throughout/);}
 const value=input();delete value.payload.composition.sections[1].data.form;assert.throws(()=>projectMicePage(value,context),/form reference/);
 for(const patch of [{regions:['india']},{animation:'fade'}]){const value=input();Object.assign(value.payload.composition.sections[0].controls,patch);assert.throws(()=>projectMicePage(value,context),/not connected/);}
});
test('MICE projection validates anchor destinations at every future schedule boundary',()=>{
 const value=input(),intro=createMiceSection('miceIntroduction','intro');intro.data={eyebrow:'Purpose',heading:{lines:[{runs:[{text:'Plan',emphasis:false}]}]},paragraphs:[{id:'p',text:'Start here'}],button:{label:'Enquire',href:'#corporate-enquiry'}};value.payload.composition.sections.push(intro);assert.doesNotThrow(()=>projectMicePage(value,context));
 intro.data.button.href='#missing';assert.throws(()=>projectMicePage(value,context),/link target/);
 intro.data.button.href='#temporary';const extra=createMiceSection('miceFormats','formats');extra.controls.anchor='temporary';extra.controls.visibleUntil='2026-10-24T00:00:00Z';extra.data={accessibleLabel:'Formats',items:[{id:'one',title:'Retreat',copy:'A shared journey'}]};value.payload.composition.sections.push(extra);assert.throws(()=>projectMicePage(value,context),/link target/);
});
