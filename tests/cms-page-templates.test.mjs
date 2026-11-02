import test from 'node:test';import assert from 'node:assert/strict';
import {pageTemplates,createPageTemplate} from '../lib/cms/page-templates.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
test('connected page templates create independent structurally publishable drafts without invented copy',()=>{
 for(const template of pageTemplates.filter(t=>!['blank','custom','conservation','contact','concept','guided','aviation','mice','kenya','tanzania'].includes(t.id))){const draft=createPageTemplate(template.id);const checked=validateStoredContent({type:'page',path:draft.path,locale:'en',payload:{composition:draft.composition}});assert.equal(checked.contentChecksPass,true,JSON.stringify(checked.findings));assert.equal(draft.composition.sections[0].controls.headingLevel,'h1');assert.deepEqual(draft.composition.sections[0].data.body,[]);draft.composition.sections[0].data.title='Changed';assert.equal(createPageTemplate(template.id).composition.sections[0].data.title,template.title);}
 const custom=createPageTemplate('custom');assert.equal(custom.path,'');assert.equal(custom.composition.sections[0].controls.headingLevel,'h1');
 const blank=createPageTemplate('blank');assert.equal(blank.path,'');assert.deepEqual(blank.composition.sections,[]);assert.throws(()=>createPageTemplate('invalid'));
});

test('empty conservation starter requires a visible page heading before publication',()=>{const draft=createPageTemplate('conservation'),checked=validateStoredContent({type:'page',path:draft.path,locale:'en',payload:{composition:draft.composition}});assert.equal(checked.contentChecksPass,false);assert.ok(checked.findings.some(f=>f.code==='conservation_page_heading_schedule'));});

test('MICE drafts cannot pass publication before trusted delivery checks are connected',()=>{const draft=createPageTemplate('mice'),checked=validateStoredContent({type:'page',path:draft.path,locale:'en',payload:{composition:draft.composition}});assert.equal(checked.contentChecksPass,false);assert.ok(checked.findings.some(f=>f.code==='publication_not_ready'));});

test('Kenya starter reserves its country path and cannot publish an unconnected draft',()=>{const draft=createPageTemplate('kenya');assert.equal(draft.path,'/destinations/kenya');assert.deepEqual(draft.composition.sections,[]);const checked=validateStoredContent({type:'page',path:draft.path,locale:'en',payload:{composition:draft.composition}});assert.equal(checked.contentChecksPass,false);assert.ok(checked.findings.some(f=>f.code==='publication_not_ready'));});
