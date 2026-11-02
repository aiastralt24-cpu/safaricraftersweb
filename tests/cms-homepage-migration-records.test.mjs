import test from 'node:test';import assert from 'node:assert/strict';
import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';
import {compareHomepageMigrationRecords} from '../lib/cms/homepage-migration-records.ts';
import {site,revision,makeHomepageMigrationFixture as fixture} from './fixtures/cms-homepage-migration.mjs';
const check=({mappings,records})=>compareHomepageMigrationRecords(homepageMigrationDependencies,mappings,site,records);
test('homepage source comparison validates all mapped visible records and binds review to exact revisions',()=>{
 const f=fixture(),result=check(f);assert.deepEqual(result.findings,[]);assert.equal(result.sourceMatches,true);assert.equal(result.readyToApply,false);assert.equal(result.revisions.length,16);
 assert.ok(result.revisions.every(item=>item.revisionId===revision));
 f.records.reverse();assert.deepEqual(check(f),result);
 assert.equal(JSON.stringify(result).includes('PRIVATE_CONSENT_EVIDENCE'),false);
});
test('wrong site, record type, route, missing records and duplicate evidence cannot pass comparison',()=>{
 for(const mutate of [r=>r[0].websiteId=revision,r=>r[0].type='testimonial',r=>r[0].path='/journeys/other',r=>r.shift()]){
  const f=fixture();mutate(f.records);const result=check(f);assert.equal(result.sourceMatches,false);assert.ok(result.findings.some(item=>['identity_mismatch','missing_record'].includes(item.code)));
 }
 const duplicate=fixture();duplicate.records.push(duplicate.records[0]);assert.throws(()=>check(duplicate),/Duplicate/);
 const unexpected=fixture();unexpected.records.push({...unexpected.records[0],id:site});assert.throws(()=>check(unexpected),/Unexpected/);
});
test('changed journey copy, hero mapping and alt text are reported without echoing private payloads',()=>{
 const f=fixture(),journey=f.records[0].payload;journey.title='PRIVATE_UNREVIEWED_TITLE';journey.duration='99 days';journey.region='Different region';journey.media[0].assetId='wrong-image';journey.media[0].alt='Wrong description';
 const result=check(f);assert.equal(result.sourceMatches,false);assert.deepEqual(result.findings.map(item=>item.field),['title','duration','region','hero.assetId','hero.alt']);assert.equal(JSON.stringify(result).includes('PRIVATE_UNREVIEWED_TITLE'),false);
});
test('guest changes, withheld identity and withdrawn consent require review without exposing personal fields',()=>{
 const f=fixture(),guest=f.records.find(item=>item.type==='testimonial').payload;
 guest.name='PRIVATE_WITHHELD_IDENTITY';guest.anonymous=true;guest.quote='A changed quote';guest.trip='Different place';guest.guestType='Other';guest.verified=false;guest.consent.status='withdrawn';
 const result=check(f);assert.equal(result.sourceMatches,false);
 for(const field of ['quote','trip','guestType','displayName','verified','consent.status'])assert.ok(result.findings.some(item=>item.field===field));
 for(const secret of ['PRIVATE_WITHHELD_IDENTITY','PRIVATE_CONSENT_EVIDENCE','A changed quote'])assert.equal(JSON.stringify(result).includes(secret),false);
});
test('expedition duration, source imagery, decorative purpose and captured date changes cannot silently migrate',()=>{
 const f=fixture(),expedition=f.records.find(item=>item.type==='photoExpedition').payload;
 expedition.duration='99 nights';expedition.image.assetId='other';expedition.image.alt='Other image';expedition.image.decorative=true;expedition.departures=[];
 const result=check(f);assert.equal(result.sourceMatches,false);
 for(const field of ['duration','image.assetId','image.alt','image.decorative','departures.date','departures.label'])assert.ok(result.findings.some(item=>item.field===field));
});
test('malformed content yields a bounded field-only finding and unsupported locale evidence is rejected',()=>{
 const f=fixture();f.records[0].payload={secret:'DO_NOT_ECHO_RAW_PAYLOAD'};
 const result=check(f);assert.equal(result.sourceMatches,false);assert.ok(result.findings.some(item=>item.code==='invalid_record'));assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO_RAW_PAYLOAD'),false);
 const foreign=fixture();foreign.records[0].locale='fr';assert.throws(()=>check(foreign));
 const missingMappings=fixture();missingMappings.mappings.records=[];assert.throws(()=>check(missingMappings),/Complete homepage source mappings/);
});
test('captured booking wording cannot disappear or change while source comparison reports a match',()=>{
 const f=fixture(),expedition=f.records.find(item=>item.path==='/photo-expeditions/svalbard-expedition').payload;
 assert.equal(check(f).sourceMatches,true);
 const next=expedition.departures.find(item=>item.status==='Full');assert.ok(next);
 for(const text of ['', '2027 is sold out\nBooking open for 2030','PRIVATE_BOOKING_COPY']){
  next.homepageNote=text;const result=check(f);assert.equal(result.sourceMatches,false);assert.ok(result.findings.some(item=>item.field==='departures.homepageNote'));assert.equal(JSON.stringify(result).includes('PRIVATE_BOOKING_COPY'),false);
 }
});
