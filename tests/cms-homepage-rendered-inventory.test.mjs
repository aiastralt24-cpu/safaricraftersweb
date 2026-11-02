import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/homepage-rendered-inventory.json' with {type:'json'};
import partners from '../content/preferred-partners.json' with {type:'json'};
test('rendered homepage capture stays bound to its traced source files and original image bytes',async()=>{
 assert.equal(inventory.mode,'legacy-read-only');assert.equal(inventory.route,'/');
 assert.equal(new Set(inventory.media.map(item=>item.sourcePath)).size,inventory.media.length);
 for(const entry of inventory.sourceProof){assert.equal(createHash('sha256').update(await readFile(new URL(`../${entry.path}`,import.meta.url))).digest('hex'),entry.sha256,`Reinspect source: ${entry.path}`);}
 for(const entry of inventory.media){assert.ok(entry.sourcePath.startsWith('/assets/'));assert.ok(!entry.sourcePath.split('/').includes('..'));assert.equal(createHash('sha256').update(await readFile(new URL(`../public${entry.sourcePath}`,import.meta.url))).digest('hex'),entry.sha256,`Reinspect image: ${entry.sourcePath}`);}
});
test('homepage capture includes every partner state without duplicated marquee images',()=>{
 assert.deepEqual(inventory.partners.map(item=>item.region),partners.map(item=>item.region));
 for(let index=0;index<partners.length;index++)assert.deepEqual(inventory.partners[index].content.images.map(image=>({src:image.sourcePath,name:image.alt})),partners[index].partners.map(partner=>({src:partner.src,name:partner.name})));
});
test('captured responsive sections retain semantic content and complete planning actions',()=>{
 assert.deepEqual(inventory.mobileSections.map(section=>section.label),inventory.sections.map(section=>section.label));
 const story=inventory.sections.find(section=>section.label==='Our story');assert.deepEqual(story.statistics.map(item=>item.term),['75+','24+','6,000+','450+']);
 const concierge=inventory.sections.find(section=>section.label==='Begin your journey');assert.equal(concierge.links.length,6);
 assert.deepEqual(concierge.links.slice(0,5).map(link=>new URL(link.href,'https://site.test').searchParams.get('region')),['India','Africa','South & Central America','Arctic & Beyond','Surprise me']);
 assert.equal(concierge.links[5].href,'/contact');
 assert.equal(new Set(inventory.guestNotes.map(note=>JSON.stringify(note.quotes))).size,inventory.guestNotes.length);
 assert.ok(inventory.guestNotes.every(note=>note.quotes.length===1&&note.images.length>=1));
});
test('hero migration capture preserves responsive video declarations and original video bytes',async()=>{
 const video=inventory.heroVideoDeclaration;
 assert.equal(video.autoplay,true);assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(video.playsInline,true);
 assert.deepEqual(video.sources,[
  {sourcePath:'/assets/safari-crafters/safari-crafters-mobile.mp4',type:'video/mp4',media:'(max-width: 767px)'},
  {sourcePath:'/assets/safari-crafters/safari-crafters.mp4',type:'video/mp4',media:null},
 ]);
 assert.equal(video.poster,inventory.sections[0].images[0].sourcePath);
 assert.equal(video.label,inventory.sections[0].images[0].alt);
 assert.deepEqual(inventory.videoMedia.map(item=>item.sourcePath).sort(),video.sources.map(item=>item.sourcePath).sort());
 for(const entry of inventory.videoMedia){
  const bytes=await readFile(new URL(`../public${entry.sourcePath}`,import.meta.url));
  assert.equal(bytes.length,entry.byteLength);assert.ok(bytes.length>0);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,`Reinspect video: ${entry.sourcePath}`);
 }
});
