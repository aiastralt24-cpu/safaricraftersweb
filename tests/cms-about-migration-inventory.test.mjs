import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
const root=new URL('../',import.meta.url);
const hash=data=>createHash('sha256').update(data).digest('hex');
test('About migration inventory matches current route, hero, motion, styling and source image bytes',async()=>{
 assert.equal(inventory.mode,'legacy-read-only');assert.equal(inventory.path,'/about');
 assert.deepEqual(inventory.sources.map(source=>source.sourcePath),['app/about/page.tsx','app/about/AboutMotion.tsx','app/simple.css','components/PageHero.tsx','components/PageHero.css']);
 for(const source of inventory.sources)assert.equal(hash(await readFile(new URL(source.sourcePath,root))),source.sha256,`Recapture changed About source: ${source.sourcePath}`);
 assert.equal(inventory.media.length,4);
 for(const media of inventory.media){assert.match(media.sourcePath,/^\/assets\/[a-z0-9/-]+\.jpg$/);assert.equal(hash(await readFile(new URL(`public${media.sourcePath}`,root))),media.sha256,`Re-review changed image: ${media.sourcePath}`);}
});
test('inventory preserves all About headings, emphasis, paragraphs, labels, links and independent portrait framing',()=>{
 const {hero,story,leadership,principles}=inventory.content;
 assert.equal(hero.heading.text,'Founded in the field.');assert.equal(hero.image.objectPosition,'50% 58%');assert.equal(hero.credit,'Safari Crafters archive');
 assert.deepEqual(leadership.profiles.map(profile=>profile.name),['Kairav Engineer','Gaurav Ramnarayanan','Trikansh Sharma']);
 assert.deepEqual(leadership.profiles.map(profile=>profile.paragraphs.length),[2,2,2]);assert.equal(story.paragraphs.length,2);
 assert.deepEqual(principles.entries.map(entry=>entry.number),['01','02']);assert.deepEqual(principles.entries.map(entry=>entry.paragraphs.length),[1,1]);
 assert.deepEqual(story.links,[{label:'Plan a journey',href:'/contact'}]);assert.deepEqual(principles.entries[1].links,[{label:'Our conservation commitment',href:'/conservation-commitment'}]);
 const headings=[hero.heading,story.heading,leadership.heading,...leadership.profiles.map(profile=>profile.role),principles.heading,...principles.entries.map(entry=>entry.heading)];
 assert.equal(headings.length,9);
 for(const heading of headings)assert.equal(heading.parts.map(part=>part.text).join('').replace(/\s+/g,' ').trim(),heading.text);
 assert.deepEqual(headings.flatMap(heading=>heading.parts.filter(part=>part.emphasis).map(part=>part.text)),['field.','intent.','terms.']);
 assert.deepEqual(leadership.profiles.map(profile=>profile.image.objectPosition),['58% 42%','50% 38%','50% 45%']);
 for(const view of ['desktop','mobile']){const captured=inventory.presentation[view];assert.equal(captured.media.length,4);for(const image of captured.media){assert.ok(image.width>0&&image.height>0);assert.equal(image.objectFit,'cover');assert.ok(image.alt);}}
 assert.equal(inventory.presentation.captureReducedMotion,true);
});
