import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planDestinationMigration} from '../lib/cms/destination-migration.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const source={slug:'forest-place',title:'Forest place',continent:'India',country:'India',status:'rich',description:'Description',intro:'Introduction',bestMonths:'Winter',image:{src:'/forest.jpg',alt:'Original forest',credit:'Archive'},gallery:[],journeys:['Forest journey'],pairings:[{slug:'other-place',title:'Other place',reason:'Continue exploring'}],editorial:{openingHeadline:'Forest mornings'},seo:{title:'SEO title',reviewedAt:'2026-07-01'}};
const id='10000000-0000-4000-8000-000000000001',image={assetId:'forest',alt:'Original forest',credit:'Archive',decorative:false};
const key=`snapshot:${sourceDigest(source)}`;
const mappings={[key]:{images:{image},references:{'journeys.0':id,'pairings.0':'20000000-0000-4000-8000-000000000001'}}};
test('destination migration requires explicit images and relationships while retaining the complete source',()=>{
 const original=structuredClone(source),blocked=planDestinationMigration([source]);assert.equal(blocked.operation,'review_only');assert.equal(blocked.readyDrafts,0);assert.deepEqual(blocked.candidates[0].source,source);
 const plan=planDestinationMigration([source],mappings),candidate=plan.candidates[0];assert.equal(plan.readyDrafts,1);assert.deepEqual(source,original);assert.equal(candidate.payload.editorial.openingHeadline,'Forest mornings');assert.equal(candidate.payload.seo.title,'SEO title');assert.equal(candidate.payload.seo.reviewedAt,undefined);assert.equal(candidate.payload.image.assetId,'forest');assert.deepEqual(candidate.payload.journeys,[{recordId:id}]);assert.equal(candidate.payload.pairings[0].reason,'Continue exploring');assert.equal(candidate.payload.heroImage,undefined);assert.ok(candidate.issues.some(i=>i.field==='heroImage'&&i.severity==='warning'));
});
test('destination migration rejects duplicates, reserved routes, unknown fields, stale mappings and unsupported video',()=>{
 assert.equal(planDestinationMigration([source,source],mappings).readyDrafts,0);
 for(const variant of [{...source,slug:'india'},{...source,extraCopy:'Do not lose me'},{...source,video:{mp4:'/film.mp4'}},{...source,editorial:{unknown:'Retain me'}},{...source,bestMonths:42}])assert.equal(planDestinationMigration([variant]).readyDrafts,0);
 const extra=structuredClone(mappings);extra[key].images['gallery.4']=image;assert.equal(planDestinationMigration([source],extra).readyDrafts,0);
 const changed={...source,title:'Changed'};assert.deepEqual(planDestinationMigration([changed],mappings).unusedMappings,[key]);
});
test('repository destination inventory is fully retained and never presented as automatically publishable',async()=>{
 const content=JSON.parse(await readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));const plan=planDestinationMigration(content.destinations);
 assert.equal(plan.count,content.destinations.length);assert.equal(plan.readyDrafts,0);
 for(const [index,candidate]of plan.candidates.entries()){assert.deepEqual(candidate.source,content.destinations[index]);assert.equal(candidate.sourceDigest,sourceDigest(content.destinations[index]));assert.ok(candidate.issues.length>0);}
});
