import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistPageFindings} from '../lib/cms/specialist-page-validation.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {createSpecialistDirectorySection} from '../lib/cms/section-drafts.ts';
const now=new Date('2026-10-22T12:00:00Z');
const draft=()=>({type:'page',path:'/specialists',locale:'en',payload:{composition:{schemaVersion:1,title:'Specialists',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Meet the team',body:[]}},createSpecialistDirectorySection('directory')]}}});
test('specialist page readiness reports the first current or future heading gap without a sampling horizon',()=>{
 const good=draft(),before=structuredClone(good);assert.deepEqual(specialistPageFindings(good,now),[]);assert.deepEqual(good,before);
 const expiry=draft();expiry.payload.composition.sections[0].controls.visibleUntil='2040-01-01T00:00:00Z';
 const result=specialistPageFindings(expiry,now);assert.equal(result[0].code,'specialist_page_heading_schedule');assert.match(result[0].message,/2040-01-01T00:00:00.000Z/);
 const startsLater=draft();startsLater.payload.composition.sections[0].controls.visibleFrom='2026-10-23T00:00:00Z';assert.match(specialistPageFindings(startsLater,now)[0].message,/2026-10-22T12:00:00.000Z/);
 const atEnd=draft();atEnd.payload.composition.sections[0].controls.visibleUntil=now.toISOString();assert.match(specialistPageFindings(atEnd,now)[0].message,/0 visible H1/);
 const blank=draft();blank.payload.composition.sections[0].data.title=' ';assert.ok(specialistPageFindings(blank,now).some(item=>item.code==='specialist_page_heading_schedule'));
 const localized=draft();localized.payload.composition.sections[0].controls.locales=['fr'];assert.ok(specialistPageFindings(localized,now).some(item=>item.code==='specialist_page_heading_schedule'));
});
test('readiness pinpoints unsupported features and payloads while allowing a scheduled directory',()=>{
 const value=draft();value.locale='fr';value.payload.extra='preserved source';value.payload.composition.sections[1].controls.animation='reveal';value.payload.composition.sections[1].controls.regions=['india'];
 const findings=specialistPageFindings(value,now);assert.ok(findings.some(item=>item.field==='locale'));assert.ok(findings.some(item=>item.field==='payload'));assert.ok(findings.some(item=>item.field==='composition.sections.1.controls.animation'));assert.ok(findings.some(item=>item.field==='composition.sections.1.controls.regions'));
 const missing=draft();missing.payload.composition.sections[1].controls.visible=false;assert.ok(specialistPageFindings(missing,now).some(item=>item.code==='specialist_page_directory'));
 const future=draft();future.payload.composition.sections[1].controls.visibleFrom='2028-01-01T00:00:00Z';assert.deepEqual(specialistPageFindings(future,now),[]);
 const gallery={id:'gallery',kind:'gallery',controls:{label:'Gallery',visibleFrom:'2028-01-01T00:00:00Z'},data:{images:[{id:'one',image:{assetId:'photo',alt:'Forest'}}]}};future.payload.composition.sections.push(gallery);assert.ok(specialistPageFindings(future,now).some(item=>item.field==='composition.sections.2.kind'));gallery.controls.visible=false;assert.deepEqual(specialistPageFindings(future,now),[]);
 assert.ok(specialistPageFindings(draft(),new Date('invalid')).some(item=>item.code==='specialist_page_time'));
});
test('saved page checks accept supported specialist layouts and reject unsupported controls',()=>{
 const value=draft();value.payload.composition.sections[1].controls.animation='fade';const checked=validateStoredContent(value);
 assert.equal(checked.contentChecksPass,false);assert.equal(checked.validatorVersion,'composition-5');assert.ok(checked.findings.some(item=>item.code==='specialist_page_animation'));assert.equal(checked.findings.some(item=>item.code==='publication_not_ready'),false);
 assert.equal(validateStoredContent(draft()).contentChecksPass,true);
 const unrelated=validateStoredContent({...value,path:'/about'});assert.equal(unrelated.findings.some(item=>item.code.startsWith('specialist_page_')),false);
});
