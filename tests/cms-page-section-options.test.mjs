import test from 'node:test';import assert from 'node:assert/strict';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {homepageSectionKinds} from '../lib/cms/homepage-projection.ts';
import {aboutSectionKinds} from '../lib/cms/about-page.ts';
test('page authoring choices follow connected renderer families and preserve unknown draft routes',()=>{
 assert.deepEqual(pageSectionOptions('homepage','/'),homepageSectionKinds);
 assert.deepEqual(pageSectionOptions('page','/about'),aboutSectionKinds.filter(kind=>kind!=='reusableFaq'));
 for(const path of ['/legal/privacy','/legal/terms','/legal/cookies'])assert.deepEqual(pageSectionOptions('page',path),['text','downloads']);
 for(const [path,kind]of [['/specialists','specialistDirectory'],['/photo-expeditions','expeditionDirectory']]){const options=pageSectionOptions('page',path);assert.ok(options.includes(kind));assert.ok(options.includes('downloads'));assert.equal(options.includes('homepageHero'),false);}
 assert.deepEqual(pageSectionOptions('page','/future-page'),aboutSectionKinds);assert.equal(pageSectionOptions('page','/admin/new'),undefined);assert.equal(pageSectionOptions('document','/about'),undefined);
});
