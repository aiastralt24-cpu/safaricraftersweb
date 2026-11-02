import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/guided-safaris-migration-inventory.json' with {type:'json'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Bespoke Safaris source capture stays bound to current source and all local media',async()=>{
 assert.equal(inventory.path,'/guided-bespoke-safaris');assert.equal(inventory.mode,'legacy-read-only');assert.equal(new Set(inventory.sources.map(s=>s.sourcePath)).size,inventory.sources.length);
 for(const item of inventory.sources)assert.equal(hash(await fs.readFile(new URL('../'+item.sourcePath,import.meta.url))),item.sha256,item.sourcePath);
 for(const item of inventory.media){const bytes=await fs.readFile(new URL('../public'+item.sourcePath,import.meta.url));assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);}
 assert.equal(inventory.media.length,8);assert.ok(inventory.sources.some(s=>s.sourcePath.endsWith('GuidedSafariMotion.tsx')));
});
test('Bespoke Safaris capture preserves all sections, FAQ states and disabled editorial content',()=>{
 assert.equal(inventory.metadata.canonical,'https://safaricrafters.com/guided-bespoke-safaris');
 const classes=['guided-hero','guided-introduction','guided-expand-shell','guided-field','guided-photography','guided-person','guided-paths','guided-faq'];
 for(const view of inventory.views){assert.equal(view.h1Count,1);assert.equal(view.overflow,false);assert.deepEqual(view.content.map(s=>s.className),classes);assert.equal(view.content[3].images.length,3);assert.equal(view.content[7].faq.length,4);assert.ok(view.content[0].links.some(l=>l.href==='/plan?guided=true'));assert.ok(view.content[0].links.some(l=>l.href==='#guided-introduction'));for(const section of view.content)for(const image of section.images)assert.ok(inventory.media.some(m=>m.sourcePath===image.sourcePath));}
 assert.deepEqual(inventory.views.map(v=>v.width),[1280,390]);assert.equal(inventory.states.length,8);
 for(const state of inventory.states){const source=inventory.views.find(v=>v.width===state.width).content.at(-1).faq[state.index];assert.equal(state.question,source.question);assert.equal(state.answer,source.answer);}
 assert.equal(inventory.conditionalSections.length,1);assert.ok(inventory.conditionalSections[0].source.includes('/specialists'));assert.equal(inventory.declarations.find(d=>d.name==='showSpecialistsCta').expression,'false');
});
