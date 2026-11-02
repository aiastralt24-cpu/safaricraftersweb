import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {planSpecialistMigration} from '../lib/cms/specialist-migration.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const source={name:'Forest Guide',role:'Naturalist',expertise:'Ecology',bio:'Biography',moment:'Field note',image:{src:'/old.jpg',alt:'Portrait',credit:'Legacy credit'}};
const image={assetId:'portrait',alt:'Portrait',decorative:false,credit:'Legacy credit'};
const snapshot={specialists:[source],journeys:[{slug:'forest',specialist:'Forest Guide'}],expeditions:[{slug:'photo',mentor:'Forest Guide',guide:'Forest Guide'}]};
test('specialist migration preserves source and relationships, requiring explicit mappings',()=>{
 const before=structuredClone(snapshot),initial=planSpecialistMigration(snapshot),key=initial.candidates[0].sourceKey;
 assert.equal(initial.operation,'review_only');assert.equal(initial.readyDrafts,0);assert.deepEqual(initial.candidates[0].relatedSources.expeditions,snapshot.expeditions);
 const mappings={profiles:{[key]:{image}},journeys:{forest:id},expeditions:{photo:other}},plan=planSpecialistMigration(snapshot,mappings),candidate=plan.candidates[0];
 assert.equal(plan.readyDrafts,1);assert.deepEqual(candidate.source,source);assert.equal(candidate.payload.bio,source.bio);assert.deepEqual(candidate.payload.journeys,[{recordId:id}]);assert.deepEqual(candidate.payload.expeditions,[{recordId:other}]);assert.deepEqual(candidate.payload.planning,{label:'Plan with Forest',enquiryName:'Forest'});assert.deepEqual(snapshot,before);assert.deepEqual(plan,planSpecialistMigration(snapshot,mappings));
});
test('specialist migration rejects ambiguous names/slugs and collapsed target identities',()=>{
 const key=planSpecialistMigration(snapshot).candidates[0].sourceKey;
 assert.equal(planSpecialistMigration({...snapshot,specialists:[source,{...source,bio:'Second person'}]}).candidates.every(c=>!c.canSaveDraft&&c.issues.some(i=>i.field==='name')),true);
 const duplicated={...snapshot,journeys:[...snapshot.journeys,{slug:'forest',specialist:'Other guide'}]};assert.ok(planSpecialistMigration(duplicated).candidates[0].issues.some(i=>/slug is duplicated/.test(i.message)));
 const collapsed={...snapshot,journeys:[...snapshot.journeys,{slug:'second',specialist:source.name}]};assert.ok(planSpecialistMigration(collapsed,{profiles:{[key]:{image}},journeys:{forest:id,second:id},expeditions:{photo:other}}).candidates[0].issues.some(i=>/same CMS record/.test(i.message)));
});
test('films and unknown fields remain reviewable; mappings cannot silently discard source data',()=>{
 const input={specialists:[{...source,video:{mp4:'/film.mp4',poster:source.image},legacyNote:'Keep me'}],journeys:[],expeditions:[]};const first=planSpecialistMigration(input),key=first.candidates[0].sourceKey;
 const missing=planSpecialistMigration(input,{profiles:{[key]:{image}}});assert.equal(missing.readyDrafts,0);assert.deepEqual(missing.candidates[0].source.video,input.specialists[0].video);assert.deepEqual(missing.candidates[0].unmappedFields,['legacyNote']);
 const film={assetId:'film',poster:image,title:'Film',caption:'Caption',transcript:'Words',captionsAssetId:'captions'};
 const ready=planSpecialistMigration(input,{profiles:{[key]:{image,video:film}},journeys:{unused:id}});assert.equal(ready.readyDrafts,1);assert.deepEqual(ready.candidates[0].payload.video,film);assert.deepEqual(ready.unusedMappings.journeys,['unused']);
 assert.throws(()=>planSpecialistMigration(input,{profiles:{[key]:{unexpected:'ignored?'}}}));
});
test('repository specialist review preserves existing directory exclusions and team identity',async()=>{
 const full=JSON.parse(await fs.readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));
 const source={specialists:full.specialists,journeys:full.journeys,expeditions:full.expeditions};const review=planSpecialistMigration(source);
 assert.equal(review.count,full.specialists.length);assert.equal(review.readyDrafts,0);assert.ok(review.unmatchedAssignments.some(item=>item.value==='Safari Crafters'));assert.ok(review.unmatchedAssignments.some(item=>item.value==='Team Safari Crafters'));assert.equal(review.unmatchedAssignments.some(item=>item.value==='Gaurav Ramnarayanan'),false);
 assert.equal(review.candidates.find(c=>c.payload.name==='Kairav Engineer').payload.visible,false);assert.equal(review.candidates.find(c=>c.payload.name==='Safari Crafters Field Team').payload.kind,'team');assert.equal(review.candidates.find(c=>c.payload.name==='Gaurav Ramnarayanan').payload.visible,true);
 for(const candidate of review.candidates){assert.equal(candidate.payload.bio,candidate.source.bio);assert.ok(candidate.issues.some(i=>i.field==='image'));}
});

test('explicit aliases resolve legacy names to selected profiles without rewriting original source',()=>{
 const input={specialists:[source],journeys:[{slug:'forest',specialist:'Old team'}],expeditions:[{slug:'photo',mentor:'Old team',guide:'Another team'}]};const key=planSpecialistMigration(input).candidates[0].sourceKey,before=structuredClone(input);
 const mappings={profiles:{[key]:{image}},aliases:{'Old team':key,'Another team':key},journeys:{forest:id},expeditions:{photo:other}};
 const plan=planSpecialistMigration(input,mappings);assert.equal(plan.readyDrafts,1);assert.deepEqual(plan.unmatchedAssignments,[]);assert.deepEqual(plan.candidates[0].payload.journeys,[{recordId:id}]);assert.deepEqual(plan.candidates[0].payload.expeditions,[{recordId:other}]);assert.deepEqual(plan.candidates[0].relatedSources.expeditions,input.expeditions);assert.deepEqual(input,before);
 assert.deepEqual(planSpecialistMigration(input,{...mappings,aliases:{...mappings.aliases,'Unused label':key}}).unusedMappings.aliases,['Unused label']);
 assert.throws(()=>planSpecialistMigration(input,{aliases:{[source.name]:key}}));assert.throws(()=>planSpecialistMigration(input,{aliases:{'Old team':'specialist_'+'f'.repeat(64)}}));assert.throws(()=>planSpecialistMigration(input,{aliases:{' ':key}}));
});
