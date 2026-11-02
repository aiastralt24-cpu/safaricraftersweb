import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
import fixture from './fixtures/cms-about-page.json' with {type:'json'};
import {sectionDataSchemas} from '../lib/cms/composition.ts';
import {projectAboutPage} from '../lib/cms/about-page.ts';
const source=inventory.content.principles;
export const principles={layout:'numbered',eyebrow:source.eyebrow,title:source.heading.text,titleAccent:'terms.',introduction:source.intro,columns:2,items:source.entries.map((item,index)=>({id:`principle-${index+1}`,eyebrow:item.eyebrow,title:item.heading.text,copy:item.paragraphs.join('\n\n'),...(item.links[0]?{link:{...item.links[0],newWindow:false}}:{})}))};
test('numbered principles preserve every captured label, heading, introduction, copy and link through About projection',()=>{
 const input=structuredClone(fixture);input.payload.composition.sections[3].data=principles;
 const output=projectAboutPage(input,{locale:'en',now:new Date('2026-10-22')}).sections[3].data;
 assert.deepEqual(output,principles);assert.deepEqual(output.items.map((_,i)=>String(i+1).padStart(2,'0')),source.entries.map(item=>item.number));
 const reversed={...principles,items:[...principles.items].reverse()};assert.equal(sectionDataSchemas.cards.parse(reversed).items[0].eyebrow,'Conservation');
});
test('numbered layout rejects hidden images and unknown layout while existing grid data stays valid',()=>{
 const withImage={...principles,items:principles.items.map(item=>({...item,image:{assetId:'portrait',alt:'A portrait'}}))};
 assert.equal(sectionDataSchemas.cards.safeParse(withImage).success,false);assert.equal(sectionDataSchemas.cards.safeParse({...withImage,layout:'grid'}).success,true);
 assert.equal(sectionDataSchemas.cards.safeParse({...principles,layout:'custom-css'}).success,false);
 assert.equal(sectionDataSchemas.cards.safeParse(fixture.payload.composition.sections[3].data).success,true);
});
