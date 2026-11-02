import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import inventory from '../docs/cms/conservation-migration-inventory.json' with {type:'json'};
import {conservationPageMetadata,projectConservationPage} from '../lib/cms/conservation-page.ts';
import {conservationContentSchema} from '../lib/cms/conservation-content.ts';
import {conservationMigrationDependencies,planConservationMigration} from '../lib/cms/conservation-migration.ts';
test('conservation inventory matches source bytes and preserves all captured business content',async()=>{
 for(const item of conservationMigrationDependencies)assert.equal(createHash('sha256').update(await fs.readFile(new URL(`../${item.sourcePath}`,import.meta.url))).digest('hex'),item.sha256,item.sourcePath);
 const plan=planConservationMigration(conservationMigrationDependencies);assert.equal(plan.readyToApply,false);assert.equal(plan.missingMedia.length,5);assert.equal(plan.content.impact.metrics.length,8);assert.equal(plan.content.fieldRecords.items.length,4);assert.equal(plan.content.footprint.regions.length,3);
 for(const key of ['intro','impact','footprint'])assert.deepEqual(plan.content[key],inventory.content[key]);assert.deepEqual(plan.content.hero.heading,inventory.content.hero.heading);assert.equal(plan.content.hero.credit,inventory.content.hero.credit);
 plan.content.fieldRecords.items.forEach((item,index)=>{const source=inventory.content.fieldRecords.items[index];for(const key of ['id','place','title','copy'])assert.equal(item[key],source[key]);assert.equal(item.image.alt,source.image.alt);});assert.deepEqual(plan.metadata,inventory.metadata);
});
test('conservation proposal refuses source drift, duplicate or stale asset bindings',()=>{
 const bindings=inventory.media.map((media,i)=>({sourcePath:media.sourcePath,sourceSha256:media.sha256,assetId:`conservation-image-${i}`}));const plan=planConservationMigration(conservationMigrationDependencies,bindings);assert.equal(plan.missingMedia.length,0);assert.equal(plan.readyToApply,false);assert.ok(plan.findings.some(f=>f.code==='provider_unverified'));
 assert.throws(()=>planConservationMigration(conservationMigrationDependencies.slice(1),bindings));assert.throws(()=>planConservationMigration(conservationMigrationDependencies.map((item,i)=>i?item:{...item,sha256:'a'.repeat(64)}),bindings));
 for(const bad of [[bindings[0],bindings[0]],bindings.map((item,i)=>i?item:{...item,sourceSha256:'a'.repeat(64)}),bindings.map((item,i)=>i?item:{...item,assetId:'review-only-forged'})])assert.throws(()=>planConservationMigration(conservationMigrationDependencies,bad));
});
test('conservation contract rejects duplicate metrics, unsafe citations and unapproved arbitrary fields',()=>{
 const content=planConservationMigration(conservationMigrationDependencies).content;
 for(const mutate of [c=>c.impact.metrics.push(c.impact.metrics[0]),c=>c.impact.source.href='javascript:alert(1)',c=>c.hero.image.alt='',c=>c.footprint.species.copy=' ',c=>c.fieldRecords.items[0].unknown='discard me',c=>c.impact.metrics.forEach(item=>item.tier='primary')]){const value=structuredClone(content);mutate(value);assert.equal(conservationContentSchema.safeParse(value).success,false);}
});

test('conservation migration preserves rendered SEO and shares the proposed hero mapping with social metadata',()=>{
 const bindings=inventory.media.map((media,i)=>({sourcePath:media.sourcePath,sourceSha256:media.sha256,assetId:`conservation-image-${i}`}));
 for(const mapping of [[],bindings]){
  const plan=planConservationMigration(conservationMigrationDependencies,mapping),seo=plan.previewPayload.seo;
  assert.equal(seo.title,inventory.metadata.title);assert.equal(seo.canonical,inventory.metadata.canonical);
  assert.deepEqual(seo.socialImage,plan.content.hero.image);assert.notEqual(seo.socialImage,plan.content.hero.image);
  const page=projectConservationPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload:plan.previewPayload},{locale:'en',now:new Date('2026-10-23T00:00:00Z')});
  const metadata=conservationPageMetadata(page,{titleTemplate:'%s | Changed default',description:'Changed default',indexing:'index'},'https://preview.example.test');
  assert.deepEqual(metadata.title,{absolute:inventory.metadata.title});assert.equal(metadata.alternates.canonical,inventory.metadata.canonical);
  assert.equal(metadata.openGraph.title,inventory.metadata.openGraph.title);assert.equal(metadata.openGraph.description,inventory.metadata.openGraph.description);
  assert.equal(metadata.openGraph.images[0].alt,inventory.content.hero.image.alt);
  assert.equal(metadata.openGraph.images[0].url,`https://preview.example.test/api/cms/published/media/${seo.socialImage.assetId}`);
  assert.equal(plan.readyToApply,false);assert.equal(plan.missingMedia.length,mapping.length?0:5);
 }
});
