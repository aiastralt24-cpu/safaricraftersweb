import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/private-aviation-migration-inventory.json' with {type:'json'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Private Aviation migration evidence is bound to current sources and image/video originals',async()=>{
 assert.equal(inventory.path,'/private-aviation');assert.equal(inventory.mode,'legacy-read-only');assert.equal(new Set(inventory.sources.map(s=>s.sourcePath)).size,inventory.sources.length);
 for(const item of inventory.sources)assert.equal(hash(await fs.readFile(new URL('../'+item.sourcePath,import.meta.url))),item.sha256,item.sourcePath);
 for(const item of inventory.media){const bytes=await fs.readFile(new URL('../public'+item.sourcePath,import.meta.url));assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);}
 assert.equal(inventory.media.length,5);assert.ok(inventory.sources.some(s=>s.sourcePath.endsWith('PrivateAviationMotion.tsx')));assert.ok(inventory.declarations.some(d=>d.name==='aircraft'));assert.ok(inventory.inlineCollections.some(c=>c.source.includes('Gateway arrival')));
});
test('Private Aviation evidence retains fleet claims, exact planning intent and responsive caption differences',()=>{
 assert.deepEqual(inventory.views.map(v=>v.width),[1280,390]);assert.equal(inventory.metadata.canonical,'https://safaricrafters.com/'); // Existing inherited value: review during migration, not silently normalize evidence.
 for(const view of inventory.views){assert.equal(view.h1Count,1);assert.equal(view.overflow,false);assert.deepEqual(view.content.map(s=>s.className.split(' ')[0]),['aviation-hero','aviation-intro','aviation-fleet','aviation-journey','aviation-service']);const [hero,intro,fleet,journey,service]=view.content;
 assert.equal(intro.routeSteps.length,4);assert.equal(journey.journeySteps.length,3);assert.equal(service.services.length,3);assert.deepEqual(fleet.aircraft.map(a=>a.name),['Gulfstream G150','Cessna Citation CJ2']);assert.ok(fleet.paragraphs.some(p=>p.includes('subject to availability, permissions and operating conditions')));
 for(const a of fleet.aircraft)assert.deepEqual(a.specifications.map(s=>s.label),['Range','Flight time','Seating']);assert.equal(hero.videos.length,1);assert.equal(hero.videos[0].muted,true);assert.equal(hero.videos[0].ariaHidden,'true');assert.equal(hero.captions[1].text,'India · By arrangement');assert.equal(hero.captions[1].visible,view.width>600);
 assert.equal(view.states.length,2);for(const state of view.states){assert.equal(state.href,'/plan?experience=private-aviation');assert.equal(state.keyboardFocusable,true);}
 for(const section of view.content){for(const image of section.images)assert.ok(inventory.media.some(m=>m.sourcePath===image.sourcePath));for(const video of section.videos){assert.ok(inventory.media.some(m=>m.sourcePath===video.poster));for(const source of video.sources)assert.ok(inventory.media.some(m=>m.sourcePath===source.src));}}
 }
 assert.deepEqual(inventory.views[0].content[2].aircraft,inventory.views[1].content[2].aircraft);
});
