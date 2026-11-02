import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import inventory from '../docs/cms/concept-migration-inventory.json' with {type:'json'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Concept inventory remains bound to its source dependencies and original local assets',async()=>{
 assert.equal(inventory.mode,'legacy-read-only');assert.equal(inventory.path,'/concept');assert.equal(new Set(inventory.sources.map(s=>s.sourcePath)).size,inventory.sources.length);
 for(const source of inventory.sources)assert.equal(sha(await fs.readFile(new URL(`../${source.sourcePath}`,import.meta.url))),source.sha256,source.sourcePath);
 for(const media of inventory.media){assert.ok(media.sourcePath.startsWith('/assets/'));const bytes=await fs.readFile(new URL(`../public${media.sourcePath}`,import.meta.url));assert.equal(sha(bytes),media.sha256,media.sourcePath);assert.equal(bytes.length,media.bytes);}
});
test('Concept evidence retains disabled source sections, interactive states and inherited SEO for review',()=>{
 assert.deepEqual(inventory.declarations.filter(d=>d.name.startsWith('showHomepage')).map(d=>[d.name,d.expression]),[['showHomepagePrivateAviation','true'],['showHomepageWildestPlaces','false'],['showHomepageConservation','false'],['showHomepagePhotographicWorlds','false'],['showHomepageSpeciesIndex','false'],['showHomepageSpeciesEditorial','false']]);
 assert.equal(inventory.conditionalSections.length,5);assert.ok(inventory.conditionalSections.some(s=>s.condition==='showHomepageConservation'&&s.source.includes('responsible')));
 assert.equal(inventory.content.length,10);assert.deepEqual(inventory.states.filter(s=>s.kind==='partner-region').map(s=>s.label),['India','Africa','Indian Subcontinent']);assert.equal(inventory.states.filter(s=>s.kind==='guest-note').length,6);
 const menu=inventory.states.find(s=>s.kind==='menu').content;for(const href of ['/journeys','/destinations','/photo-expeditions','/contact'])assert.ok(menu.links.some(link=>link.href===href));
 assert.equal(inventory.metadata.canonical,'https://safaricrafters.com/');assert.deepEqual(inventory.checks.map(c=>[c.width,c.h1Count]),[[1280,1],[390,1]]);
});

test('Concept migration evidence preserves copy structure, responsive framing and hero declarations',()=>{
 const section=label=>inventory.content.find(item=>item.navLabel===label);
 assert.equal(section('Our story').paragraphs.length,3);
 assert.ok(section('Our story').paragraphs.every(item=>item.parts.length&&item.text.trim()));
 assert.equal(section('Our story').statistics.length,4);
 assert.equal(section('Private journeys').migration.journeys.length,3);
 assert.ok(section('Private journeys').migration.journeys.every(item=>item.href.startsWith('/journeys/')&&item.action&&item.kicker));
 assert.equal(section('Corporate journeys').figures.length,2);
 assert.equal(section('Private jet safaris').migration.benefits.length,3);
 assert.deepEqual(inventory.viewportContent.map(view=>view.width),[1280,390]);
 for(const view of inventory.viewportContent){assert.deepEqual(view.sections.map(item=>item.navLabel),inventory.content.map(item=>item.navLabel));for(const section of view.sections)for(const image of section.images){assert.match(image.objectPosition,/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);assert.ok(inventory.media.some(media=>media.sourcePath===image.sourcePath));}}
 assert.ok(inventory.heroFrames.length>1);assert.ok(inventory.heroFrames.every(frame=>(frame.lead+frame.rest+frame.accent).trim()));
 const video=inventory.heroVideoDeclaration;assert.equal(video.muted,true);assert.equal(video.autoplay,true);assert.equal(video.loop,true);assert.equal(video.playsInline,true);assert.equal(video.sources.length,2);
 for(const source of video.sources){assert.equal(source.type,'video/mp4');assert.ok(inventory.media.some(media=>media.sourcePath===source.sourcePath));}
});
