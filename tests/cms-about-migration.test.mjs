import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/about-migration-inventory.json' with {type:'json'};
import review from '../docs/cms/about-migration-review.json' with {type:'json'};
import {aboutMigrationDependencies,planAboutMigration} from '../lib/cms/about-migration.ts';
test('About review preserves complete source content and is explicitly unapplied with unmapped images',()=>{
 const result=planAboutMigration(aboutMigrationDependencies);assert.deepEqual(result,review);assert.equal(result.readyToApply,false);assert.equal(result.missingMedia.length,4);
 const [hero,story,leadership,principles]=result.previewPayload.composition.sections;
 assert.deepEqual([hero.data.title,story.data.title,leadership.data.title,principles.data.title],[inventory.content.hero.heading.text,inventory.content.story.heading.text,inventory.content.leadership.heading.text,inventory.content.principles.heading.text]);
 assert.equal(hero.data.copy,inventory.content.hero.copy);assert.equal(hero.data.desktop.credit,inventory.content.hero.credit);
 assert.deepEqual(story.data.body.filter(b=>b.kind==='paragraph').map(b=>b.text),inventory.content.story.paragraphs);assert.deepEqual(story.data.body.filter(b=>b.kind==='link').map(({kind,style,...link})=>link),inventory.content.story.links);
 leadership.data.items.forEach((profile,i)=>{const source=inventory.content.leadership.profiles[i];assert.equal(profile.eyebrow,source.name);assert.equal(profile.title,source.role.text);assert.deepEqual(profile.copy.split('\n\n'),source.paragraphs);assert.equal(profile.image.alt,source.image.alt);});
 principles.data.items.forEach((item,i)=>{const source=inventory.content.principles.entries[i];assert.equal(item.eyebrow,source.eyebrow);assert.equal(item.copy,source.paragraphs.join('\n\n'));assert.equal(item.link?.href,source.links[0]?.href);});
 assert.equal(result.previewPayload.seo.title,'About');assert.equal(result.previewPayload.seo.description,inventory.metadata.description);
});
test('stale proofs and ambiguous or stale media bindings fail closed; complete proposals still need provider/apply verification',()=>{
 const stale=structuredClone(aboutMigrationDependencies);stale[0].sha256='0'.repeat(64);assert.throws(()=>planAboutMigration(stale),/changed/);assert.throws(()=>planAboutMigration([...aboutMigrationDependencies,aboutMigrationDependencies[0]]),/changed/);
 const bindings=inventory.media.map((media,i)=>({sourcePath:media.sourcePath,sourceSha256:media.sha256,assetId:`verified-proposal-${i}`}));
 for(const bad of [[...bindings,bindings[0]],bindings.map(item=>({...item,assetId:'same'})),[{...bindings[0],sourceSha256:'0'.repeat(64)}],[{...bindings[0],assetId:'review-only-about-1'}]])assert.throws(()=>planAboutMigration(aboutMigrationDependencies,bad));
 const mapped=planAboutMigration(aboutMigrationDependencies,bindings);assert.equal(mapped.missingMedia.length,0);assert.equal(mapped.readyToApply,false);assert.ok(mapped.findings.some(f=>f.code==='media_provider_unverified'));assert.doesNotMatch(JSON.stringify(mapped.previewPayload),/review-only-about/);
});
