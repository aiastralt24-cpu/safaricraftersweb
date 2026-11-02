import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {journalMigrationDate,planJournalMigration} from '../lib/cms/journal-migration.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const img=(src,alt)=>({src,alt,credit:'Archive'});
const source=()=>({slug:'forest',title:'Forest',category:'Wildlife',author:'Guide',date:'February 20, 2026',description:'Forest notes',readTime:'3 Min Read',body:['First paragraph.','Second paragraph.'],quote:'Slow down.',image:img('/listing.jpg','Listing'),gallery:[img('/listing.jpg','Duplicate'),img('/hero.jpg','Hero'),img('/other.jpg','Other')]});
function maps(s){const convert=value=>({assetId:'mapped-'+value.alt.toLowerCase(),alt:value.alt,credit:value.credit,decorative:false});return {[`snapshot:${sourceDigest(s)}`]:{images:{image:convert(s.image),...Object.fromEntries(s.gallery.map((image,i)=>[`gallery.${i}`,convert(image)]))}}};}
test('journal migration preserves exact paragraphs and legacy hero/gallery behavior without mutating sources',()=>{
 const s=source(),before=structuredClone(s),mapping=maps(s),result=planJournalMigration([s],mapping),candidate=result.candidates[0];assert.equal(result.operation,'review_only');assert.equal(result.readyDrafts,1);assert.equal(candidate.heroSourcePath,'gallery.1');assert.equal(candidate.payload.heroImage.alt,'Hero');assert.deepEqual(candidate.payload.gallery.map(i=>i.alt),['Other']);assert.deepEqual(candidate.payload.body.map(b=>b.text),s.body);assert.equal(candidate.payload.date,'2026-02-20');assert.deepEqual(candidate.source,before);assert.deepEqual(s,before);assert.deepEqual(candidate.mappings,mapping[candidate.sourceKey]);assert.deepEqual(candidate.retainedGalleryPaths,['gallery.0']);assert.deepEqual(planJournalMigration([s],mapping),result);
});
test('migration calendar conversion rejects ambiguous and impossible dates',()=>{
 for(const date of ['02/03/2026','February 30, 2026','Feb 20, 2026','2026-02-29','2026-10-22T00:00:00Z','',null])assert.equal(journalMigrationDate(date),null);
 assert.equal(journalMigrationDate('February 29, 2024'),'2024-02-29');assert.equal(journalMigrationDate('2026-10-22'),'2026-10-22');
});
test('journal migration blocks missing mappings, altered attribution, unknown fields, videos and duplicate identities',()=>{
 const s=source();assert.equal(planJournalMigration([s]).readyDrafts,0);
 const mapping=maps(s);mapping[Object.keys(mapping)[0]].images.image.alt='Changed';assert.equal(planJournalMigration([s],mapping).readyDrafts,0);
 for(const patch of [{video:{mp4:'/film.mp4'}},{extra:'Do not lose this'},{date:'03/04/2026'},{body:[{text:'Unexpected rich text'}]},{image:{...s.image,focalPoint:'top'}}]){const value={...s,...patch};const plan=planJournalMigration([value],maps(value));assert.equal(plan.readyDrafts,0);assert.deepEqual(plan.candidates[0].source,value);}
 const duplicates=planJournalMigration([s,s],maps(s));assert.equal(duplicates.readyDrafts,0);assert.ok(duplicates.candidates.every(c=>c.issues.some(i=>i.field==='slug')));
 const unused=maps(s);unused[Object.keys(unused)[0]].images.typo={assetId:'unused',alt:'Unused',decorative:false};assert.equal(planJournalMigration([s],unused).readyDrafts,0);
});
test('actual journal snapshot remains review-only and reports every unmapped article',async()=>{
 const snapshot=JSON.parse(await fs.readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));const plan=planJournalMigration(snapshot.journal);assert.equal(plan.count,snapshot.journal.length);assert.equal(plan.readyDrafts,0);assert.ok(plan.candidates.every(c=>c.issues.some(i=>i.severity==='error'&&i.message.startsWith('Map this image'))));assert.ok(plan.candidates.every(c=>c.payload.body.length===c.source.body.length));assert.ok(plan.candidates.every(c=>c.payload.date));
});
