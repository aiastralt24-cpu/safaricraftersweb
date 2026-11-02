import test from 'node:test';import assert from 'node:assert/strict';
import {headingParts} from '../lib/cms/heading-emphasis.ts';
import {sectionDataSchemas} from '../lib/cms/composition.ts';
import {projectAboutPage} from '../lib/cms/about-page.ts';
import fixture from './fixtures/cms-about-page.json' with {type:'json'};
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
test('legacy About emphasis can be represented without changing any heading text',()=>{
 for(const entry of [inventory.content.hero,inventory.content.story,inventory.content.principles]){
 const title=entry.heading.text,titleAccent=entry.heading.parts.find(part=>part.emphasis).text;
 const data=sectionDataSchemas.text.parse({title,titleAccent,body:[]}),parts=headingParts(data.title,data.titleAccent);
 assert.equal(parts.before+parts.emphasis+parts.after,title);assert.equal(parts.emphasis,titleAccent);
 }
 const source=structuredClone(fixture);source.payload.composition.sections[0].data.titleAccent='field.';
 assert.equal(projectAboutPage(source,{locale:'en',now:new Date('2026-10-22')}).sections[0].data.titleAccent,'field.');
});
test('stale emphasis, blank phrases and emphasis without a heading fail validation',()=>{
 for(const data of [{title:'New heading',titleAccent:'Old'},{title:'New heading',titleAccent:' '},{titleAccent:'Heading'},{title:'New heading',titleAccent:''}])assert.equal(sectionDataSchemas.text.safeParse({...data,body:[]}).success,false);
 assert.equal(sectionDataSchemas.text.safeParse({body:[]}).success,true);
 assert.deepEqual(headingParts('Wild wild wildlife','wild'),{before:'Wild ',emphasis:'wild',after:' wildlife'});
 assert.deepEqual(headingParts('Plain heading'),{before:'Plain heading',emphasis:'',after:''});
});
