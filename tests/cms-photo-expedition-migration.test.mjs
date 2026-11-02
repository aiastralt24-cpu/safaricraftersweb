import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planPhotoExpeditionMigration} from '../lib/cms/photo-expedition-migration.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
const source={slug:'forest',title:'Forest',geography:'India',publicationStatus:'published',price:'INR 1,20,000 + tax',date:'Dates on request',image:{src:'/forest.webp',alt:'Forest'},gallery:[],days:[{title:'Arrival',copy:'Arrive.',stay:'Lodge'}],departures:[{date:'2028-02-29',status:'Full'}],faqs:[{question:'Source question?',answer:'Source answer.'}],cancellationPolicy:'Original cancellation terms'};
const image={assetId:'forest',alt:'Forest',decorative:false};
function mapped(value=source){
 const key=planPhotoExpeditionMigration([value]).candidates[0].sourceKey,draft=newPhotoExpedition();
 return {[key]:{images:{image},programmeStatus:'confirmed',specialists:[],display:{heroTitle:'Reviewed hero',heroCopy:'Reviewed copy',heroImage:image,gallery:[],labels:draft.labels,booking:{...draft.booking,cancellationPolicy:value.cancellationPolicy},enquiry:{...draft.enquiry,form:{recordId:'00000000-0000-4000-8000-000000000001'}},additionalFaqs:[{id:'runtime-question',question:'Runtime question?',answer:'Reviewed answer.'}],reviewedOn:'2026-10-22',reviewNotes:'Checked displayed gallery, generated FAQs and enquiry context.'}}};
}
test('expedition migration preserves source and reviewed mapping, exact money/date wording and deterministic IDs',()=>{
 const maps=mapped(),before=structuredClone({source,maps}),plan=planPhotoExpeditionMigration([source],maps),candidate=plan.candidates[0];
 assert.equal(plan.operation,'review_only');assert.equal(plan.readyDrafts,1);assert.equal(candidate.payload.price,source.price);assert.equal(candidate.payload.dateLabel,source.date);
 assert.equal(candidate.payload.departures[0].id,'departures-1');assert.equal(candidate.payload.departures[0].status,'Full');assert.equal(candidate.payload.days[0].stay,'Lodge');assert.equal(candidate.payload.faqs.length,2);
 assert.deepEqual(candidate.source,source);assert.deepEqual({source,maps},before);assert.deepEqual(plan,planPhotoExpeditionMigration([source],maps));
 candidate.payload.heroTitle='Changed';candidate.mapping.display.reviewNotes='Changed';assert.deepEqual({source,maps},before);
});
test('migration blocks unmapped images, malformed nested data, duplicate URLs, films and unknown fields',()=>{
 assert.equal(planPhotoExpeditionMigration([source]).readyDrafts,0);
 for(const change of [{extra:'Keep me'},{video:{mp4:'/film.mp4'}},{departures:[{date:'2027-02-29',status:'Available'}]},{days:[{title:'Day',copy:'Copy',unknown:'preserve'}]},{days:[{id:'existing',title:'Day',copy:'Copy'}]},{gallery:[{src:'/other.webp'}]},{heroTitle:42},{cancellationPolicy:42}]){
  const value={...source,...change};let maps=mapped();const key=planPhotoExpeditionMigration([value]).candidates[0].sourceKey;maps={[key]:Object.values(maps)[0]};
  assert.equal(planPhotoExpeditionMigration([value],maps).readyDrafts,0,JSON.stringify(change));
 }
 assert.equal(planPhotoExpeditionMigration([source,source],mapped()).readyDrafts,0);
 const maps=mapped();Object.values(maps)[0].images.unused=image;assert.equal(planPhotoExpeditionMigration([source],maps).readyDrafts,0);
 const changed={...source,title:'Revised source'};assert.equal(planPhotoExpeditionMigration([changed],mapped()).unusedMappings.length,1);
});
test('real snapshot is inventoried without creating or approving unmapped drafts',()=>{
 const snapshot=JSON.parse(readFileSync(new URL('../content/site-content.json',import.meta.url),'utf8'));
 const before=structuredClone(snapshot.expeditions),plan=planPhotoExpeditionMigration(snapshot.expeditions);
 assert.equal(plan.count,snapshot.expeditions.length);assert.ok(plan.count>0);assert.equal(plan.readyDrafts,0);assert.deepEqual(snapshot.expeditions,before);
 assert.ok(plan.candidates.every(item=>item.issues.some(issue=>issue.field==='mapping')));
});
test('booking enquiry wording requires explicit digest-bound availability mappings with exact departure identity and date',()=>{
 const value={...source,enquiryDeparture:'2029 — dates to be confirmed'},maps=mapped(value),mapping=Object.values(maps)[0];
 assert.equal(planPhotoExpeditionMigration([value],maps).readyDrafts,0);
 mapping.departureHomepageNotes={'departures-1':{date:'2028-02-29',text:'2028 is sold out\nBooking open for 2029'}};
 const result=planPhotoExpeditionMigration([value],maps);assert.equal(result.readyDrafts,1);assert.equal(result.candidates[0].payload.departures[0].homepageNote,mapping.departureHomepageNotes['departures-1'].text);assert.deepEqual(result.candidates[0].source,value);
 mapping.departureHomepageNotes['departures-1'].date='2028-03-01';assert.equal(planPhotoExpeditionMigration([value],maps).readyDrafts,0);
 mapping.departureHomepageNotes['departures-1'].date='2028-02-29';mapping.departureHomepageNotes['departures-2']={date:'2028-02-29',text:'Unused'};assert.equal(planPhotoExpeditionMigration([value],maps).readyDrafts,0);
 delete mapping.departureHomepageNotes['departures-2'];assert.equal(planPhotoExpeditionMigration([{...value,enquiryDeparture:'2030'}],maps).readyDrafts,0);
 mapping.departureHomepageNotes['departures-1'].text=' ';assert.throws(()=>planPhotoExpeditionMigration([value],maps));
});
