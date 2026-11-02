import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/concept-migration-inventory.json' with {type:'json'};
import {conceptNavigationSchema,conceptMenuHref,conceptMenuLinks} from '../lib/cms/concept-navigation.ts';
import {planConceptNavigationMigration,conceptNavigationDependencies as proof} from '../lib/cms/concept-navigation-migration.ts';
const mappings=()=>[...new Set(inventory.navigation.primary.map(item=>item.image.sourcePath))].map((path,index)=>({sourcePath:path,sourceSha256:inventory.media.find(m=>m.sourcePath===path).sha256,assetId:`menu-image-${index+1}`}));
test('Concept menu proposal preserves source order, labels and decorative imagery without mutating shared settings',()=>{
 const p=planConceptNavigationMigration(proof);assert.equal(p.readyToApply,false);assert.deepEqual(p.owner,{type:'page',path:'/concept'});assert.equal(p.missingMedia.length,6);assert.equal(p.navigation.primary.length,6);assert.equal(p.navigation.secondary.length,6);
 assert.deepEqual(p.navigation.primary.map(({id,label,href})=>({id,label,href})),inventory.navigation.primary.map(({id,label,href})=>({id,label,href})));
 for(const item of p.navigation.primary){assert.equal(item.image.decorative,true);assert.equal(item.image.alt,'');}
 for(const key of ['navigationLabel','contextLabel','openLabel','closeLabel','closeText','primaryLabel','secondaryLabel'])assert.equal(p.navigation[key],inventory.navigation[key]);
 assert.equal(conceptMenuLinks(p.navigation).length,13);assert.equal(p.navigation.cta.href,'/plan');p.navigation.primary[0].label='Changed';assert.notEqual(planConceptNavigationMigration(proof).navigation.primary[0].label,'Changed');
});
test('Concept menu mappings bind original hashes and reject stale, duplicate, unknown and unreviewed identities',()=>{
 const selected=mappings(),mapped=planConceptNavigationMigration(proof,selected);assert.equal(mapped.missingMedia.length,0);assert.equal(mapped.readyToApply,false);assert.deepEqual(mapped.navigation.primary.map(p=>p.image.assetId),selected.map(m=>m.assetId));
 for(const bad of [selected.map((m,i)=>i?m:{...m,sourceSha256:'0'.repeat(64)}),[...selected,selected[0]],selected.map((m,i)=>i?m:{...m,sourcePath:'/assets/unknown.webp'}),selected.map(m=>({...m,assetId:'same'})),selected.map((m,i)=>i?m:{...m,assetId:'review-only-fake'})])assert.throws(()=>planConceptNavigationMigration(proof,bad));
 assert.throws(()=>planConceptNavigationMigration(proof.slice(1)));assert.throws(()=>planConceptNavigationMigration(proof.map((p,i)=>i?p:{...p,sha256:'0'.repeat(64)})));
});
test('Concept menu rejects unsafe links, duplicate identities and unbounded or unrecognized fields',()=>{
 for(const href of ['javascript:alert(1)','//evil.test','/a/../b','/a/./b','/a\\b','/%2fexample','https://name:password@example.test','http://example.test',' /contact'])assert.equal(conceptMenuHref.safeParse(href).success,false,href);
 for(const href of ['/contact','/mice#corporate-enquiry','/plan?region=India','https://example.test/travel'])assert.equal(conceptMenuHref.safeParse(href).success,true,href);
 const input=planConceptNavigationMigration(proof,mappings()).navigation;
 for(const change of [v=>v.primary=[],v=>v.secondary[0].id=v.primary[0].id,v=>v.openLabel=' ',v=>v.sharedMenu={recordId:'foreign'},v=>v.primary[0].image.decorative=false,v=>v.primary.push(...Array.from({length:13},()=>v.primary[0]))]){const bad=structuredClone(input);change(bad);assert.equal(conceptNavigationSchema.safeParse(bad).success,false);}
});
