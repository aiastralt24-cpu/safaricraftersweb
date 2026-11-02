import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {capturedHeadingToEditorial,capturedParagraphToEditorial} from '../lib/cms/captured-editorial.ts';import {editorialHeadingText} from '../lib/cms/editorial-heading.ts';
import {readDefaultHomepageHeroLines,resolveCapturedHomepageHeroLines} from '../scripts/cms/static-homepage-hero.mjs';
import inventory from '../docs/cms/homepage-rendered-inventory.json' with {type:'json'};
test('captured homepage editorial headings preserve explicit breaks and every emphasis fragment',()=>{
 for(const section of inventory.sections.filter(section=>section.label!=='The wild, considered'))for(const heading of section.headings){const result=capturedHeadingToEditorial(heading.parts);assert.equal(editorialHeadingText(result).replaceAll('\n',''),heading.text);}
 const story=inventory.sections.find(section=>section.label==='Our story').headings[0];const result=capturedHeadingToEditorial(story.parts);assert.equal(editorialHeadingText(result),'Informed by intention,\nguided by experience.');assert.deepEqual(result.lines.flatMap(line=>line.runs).filter(run=>run.emphasis).map(run=>run.text),['intention,','experience.']);
});
test('captured paragraph conversion preserves inline strong copy and only collapses HTML whitespace',()=>{
 const paragraphs=inventory.sections.find(section=>section.label==='Ways to journey').paragraphs;
 for(const paragraph of paragraphs){const result=capturedParagraphToEditorial(paragraph.parts);assert.equal(result.runs.map(run=>run.text).join(''),paragraph.text);}
 assert.equal(paragraphs.map(paragraph=>capturedParagraphToEditorial(paragraph.parts)).flatMap(p=>p.runs).find(run=>run.strong).text,'Safari Crafters');
 const result=capturedParagraphToEditorial([{text:'  A\n '},{tag:'strong',children:[{text:' bold '}]},{text:' word.  '}]);assert.equal(result.runs.map(run=>run.text).join(''),'A bold word.');
});
test('unknown captured markup and attributes block migration instead of silently removing formatting',()=>{
 for(const parts of [[{tag:'script',children:[{text:'unsafe'}]}],[{tag:'span',children:[{text:'Unknown styled text'}]}],[{text:'Copy',html:'anything'}],[{tag:'br',children:[{text:'unexpected'}]}]])assert.throws(()=>capturedHeadingToEditorial(parts));
 assert.throws(()=>capturedParagraphToEditorial([{text:'Before'},{tag:'br',children:[]},{text:'After'}]));
 assert.throws(()=>capturedHeadingToEditorial([{text:'A'},{tag:'br',children:[]}]));
});
test('hero source extraction captures every frame without evaluating source expressions',async()=>{
 const source=await readFile(new URL('../app/concept/ConceptExperience.tsx',import.meta.url),'utf8');const defaults=readDefaultHomepageHeroLines(source);const bundled=JSON.parse(await readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));assert.deepEqual(inventory.heroFrames,resolveCapturedHomepageHeroLines(defaults,bundled.homepage));assert.equal(defaults.length,5);assert.deepEqual(defaults.map(line=>line.accent),['Stillness.','Beautifully.','Frame.','Trail.','Encounters.']);
 assert.deepEqual(resolveCapturedHomepageHeroLines(defaults,undefined),defaults);assert.deepEqual(resolveCapturedHomepageHeroLines(defaults,{title:'CMS title',heroLines:[]}),[{lead:'CMS title',rest:'',accent:''}]);
 assert.deepEqual(resolveCapturedHomepageHeroLines(defaults,{title:'CMS title',heroLines:[{lead:'Managed',rest:'by',accent:'Client'}]}),[{lead:'Managed',rest:'by',accent:'Client'}]);
 for(const source of ["const defaultHeroLines = loadSecret();","const defaultHeroLines = [{lead: 'x', rest:'', accent: String(globalThis.secret)}];","const defaultHeroLines = [{lead:'a',lead:'b',rest:'',accent:''}];","const defaultHeroLines = [{...external}];"])assert.throws(()=>readDefaultHomepageHeroLines(source));
});
