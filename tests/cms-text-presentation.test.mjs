import test from 'node:test';import assert from 'node:assert/strict';
import {sectionDataSchemas} from '../lib/cms/composition.ts';
import {aboutMigrationDependencies,planAboutMigration} from '../lib/cms/about-migration.ts';
import {projectAboutPage} from '../lib/cms/about-page.ts';
test('About story proposal now preserves the split layout and button without weakening link validation',()=>{
 const review=planAboutMigration(aboutMigrationDependencies),story=review.previewPayload.composition.sections[1];assert.equal(story.data.layout,'split');assert.equal(story.data.body.at(-1).style,'button');assert.equal(story.data.body.at(-1).href,'/contact');assert.ok(!review.findings.some(f=>f.code==='story_layout'));
 const payload=structuredClone(review.previewPayload);payload.composition.sections[1].data.body.at(-1).href='/cms';assert.throws(()=>projectAboutPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload},{locale:'en',now:new Date('2026-10-22')}),/verified/);
});
test('text presentation remains optional and rejects unsupported layouts and link styles',()=>{
 assert.equal(sectionDataSchemas.text.safeParse({body:[]}).success,true);assert.equal(sectionDataSchemas.text.safeParse({layout:'split',body:[]}).success,false);
 assert.equal(sectionDataSchemas.text.safeParse({layout:'custom',title:'Title',body:[]}).success,false);
 assert.equal(sectionDataSchemas.text.safeParse({body:[{kind:'link',label:'Contact',href:'/contact',style:'position:fixed'}]}).success,false);
});
