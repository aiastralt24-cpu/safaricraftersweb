import test from 'node:test';import assert from 'node:assert/strict';
import fixture from './fixtures/cms-about-page.json' with {type:'json'};
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
import {sectionDataSchemas} from '../lib/cms/composition.ts';import {projectAboutPage} from '../lib/cms/about-page.ts';
test('overlay About hero preserves captured copy, emphasis, credit and focal point',()=>{
 const input=structuredClone(fixture),hero=input.payload.composition.sections[0].data,source=inventory.content.hero;
 Object.assign(hero,{layout:'overlay',eyebrow:source.eyebrow,title:source.heading.text,titleAccent:'field.',copy:source.copy,desktop:{...hero.desktop,alt:source.image.alt,credit:source.credit},desktopFraming:{shape:'natural',x:50,y:58}});
 const output=projectAboutPage(input,{locale:'en',now:new Date('2026-10-22')}).sections[0].data;
 assert.equal(output.layout,'overlay');assert.equal(output.copy,source.copy);assert.equal(output.desktop.credit,source.credit);assert.equal(output.desktop.alt,source.image.alt);assert.equal(output.titleAccent,'field.');assert.equal(output.desktopFraming.y,58);assert.equal(output.mobile.alt,'Guide portrait');
});
test('hero layout stays opt-in and permits only approved presentations',()=>{
 const legacy=fixture.payload.composition.sections[0].data;assert.equal(sectionDataSchemas.hero.parse(legacy).layout,undefined);
 assert.equal(sectionDataSchemas.hero.safeParse({...legacy,layout:'custom-html'}).success,false);
});
