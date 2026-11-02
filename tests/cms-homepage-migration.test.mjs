import test from 'node:test';import assert from 'node:assert/strict';
import capture from '../docs/cms/homepage-rendered-inventory.json' with {type:'json'};
import {homepageCaptureDigest,homepageMigrationDependencies,homepageMigrationMedia,homepageMigrationRecords} from '../lib/cms/homepage-migration-review.ts';
import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';
import {editorialHeadingText} from '../lib/cms/editorial-heading.ts';
const mappings=()=>({captureDigest:homepageCaptureDigest,
 media:homepageMigrationMedia.map((item,index)=>({sourcePath:item.sourcePath,sourceSha256:item.sha256,assetId:`asset-${index}`})),
 records:homepageMigrationRecords.map((item,index)=>({sourceKey:item.sourceKey,recordId:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`})),
});
test('unmapped homepage sources cannot produce synthetic reference IDs in a composition',()=>{
 const plan=planHomepageMigration(homepageMigrationDependencies);assert.equal(plan.previewPayload,null);assert.equal(plan.readyToApply,false);
 const missing=mappings();missing.records.pop();assert.equal(planHomepageMigration(homepageMigrationDependencies,missing).previewPayload,null);
});
test('complete proposed mappings produce all ten ordered homepage section families while retaining review gates',()=>{
 const mapped=mappings(),plan=planHomepageMigration(homepageMigrationDependencies,mapped);
 assert.equal(plan.readyToApply,false);assert.ok(plan.previewPayload);
 const sections=plan.previewPayload.composition.sections;
 assert.deepEqual(sections.map(item=>item.controls.label),capture.sections.map(item=>item.label));
 assert.deepEqual(sections.map(item=>item.kind),['homepageHero','homepageStory','homepageJourneyTypes','homepageJourneys','homepageDepartures','homepageCorporate','homepageAviation','homepagePartners','homepageGuestNotes','homepageConcierge']);
 assert.equal(sections.filter(item=>item.controls.headingLevel==='h1').length,1);
 assert.equal(plan.previewPayload.seo.description,capture.metadata.description);
 assert.ok(plan.findings.some(item=>item.code==='provider_verification_required'));assert.ok(plan.findings.some(item=>item.code==='record_copy_review'));
 assert.ok(!plan.findings.some(item=>item.code==='composition_pending'));
 const hero=sections[0].data;assert.equal(hero.frames.length,5);
 assert.equal(editorialHeadingText(hero.frames[0].heading),'In pursuit\nof Stillness.');assert.equal(hero.background.kind,'video');
 for(const [field,index] of [['desktopAssetId',1],['mobileAssetId',0]])assert.equal(hero.background[field],mapped.media.find(item=>item.sourcePath===capture.heroVideoDeclaration.sources[index].sourcePath).assetId);
 const story=sections[1].data;assert.equal(editorialHeadingText(story.heading),'Informed by intention,\nguided by experience.');assert.deepEqual(story.statistics.map(item=>item.value),[75,24,6000,450]);
 assert.ok(story.statistics.every(item=>item.source==='')); // source claims are preserved, never fabricated evidence
 const ways=sections[2].data;assert.equal(editorialHeadingText(ways.items[0].heading),'Private\nJourneys');assert.ok(ways.items[1].copy.runs.some(run=>run.strong&&run.text==='Safari Crafters'));
 const curated=sections[3].data;assert.deepEqual(curated.items.map(item=>item.kicker),['The signature journey','Into the heart of India','Beyond the familiar']);
 assert.deepEqual(curated.items.map(item=>item.recordId),mapped.records.slice(0,3).map(item=>item.recordId));
 const departures=sections[4].data;assert.equal(departures.overrides.length,7);assert.equal(departures.overrides[0].title,'Kanha');assert.equal(departures.overrides[0].location,'Kanha, India');
 const corporate=sections[5].data;assert.equal(corporate.formats[0].label,'Employee, dealer & distributor incentives');assert.equal(corporate.mainImage.caption,'India · Shared discoveries');assert.equal(corporate.insetImage.caption,'International · Beyond borders');assert.deepEqual(corporate.mainFocalPoint,{x:50,y:60});assert.deepEqual(corporate.insetFocalPoint,{x:42,y:50});
 const sourceMobile=capture.mobileSections.find(item=>item.label==='Corporate journeys');for(const [key,index] of [['mainMobileFocalPoint',0],['insetMobileFocalPoint',1]])assert.equal(`${corporate[key].x}% ${corporate[key].y}%`,sourceMobile.images[index].objectPosition);
 const aviation=sections[6].data;assert.equal(aviation.desktopFraming.x,43);assert.deepEqual(aviation.benefits.map(item=>item.text),['Private aircraft','Remote wilderness','Seamless routing']);
 const partners=sections[7].data;assert.deepEqual(partners.regions.map(item=>item.items.length),[17,38,23]);assert.deepEqual(partners.regions.map(item=>item.label),capture.partners.map(item=>item.region));
 assert.equal(sections[8].controls.mediaAlign,'start');assert.equal(sections[8].controls.mobileOrder,'mediaFirst');const guests=sections[8].data;assert.equal(guests.items.length,6);assert.deepEqual(guests.items.map(item=>item.href),capture.guestNotes.map(item=>item.links[1].href));assert.equal(guests.previousLabel,'Previous guest note');
 assert.deepEqual(sections[9].data.choices.map(item=>item.link.href),capture.sections.at(-1).links.slice(0,5).map(item=>item.href));
});
test('binding order does not change selected record order or media associations',()=>{
 const mapped=mappings(),baseline=planHomepageMigration(homepageMigrationDependencies,mapped);
 mapped.records.reverse();mapped.media.reverse();
 assert.deepEqual(planHomepageMigration(homepageMigrationDependencies,mapped).previewPayload,baseline.previewPayload);
});
