import test from 'node:test';import assert from 'node:assert/strict';
import {resolveHomepageDependencies} from '../lib/cms/homepage-dependencies.ts';import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';import {site,revision,makeHomepageMigrationFixture} from './fixtures/cms-homepage-migration.mjs';
const context={locale:'en',now:new Date('2026-10-23T00:00:00Z')};
function fixture(){const f=makeHomepageMigrationFixture(),input={recordId:site,revisionId:revision,type:'homepage',payload:planHomepageMigration(homepageMigrationDependencies,f.mappings).previewPayload};
 const journeys=f.records.filter(r=>r.type==='journey').map((r,i)=>({recordId:r.id,revisionId:revision,path:`/journeys/journey-${i}`,modifiedAt:'2026-10-23T00:00:00Z',slug:`journey-${i}`,title:r.payload.title,description:'Published description',region:'India',duration:'5 days',bestMonths:'November',hero:{assetId:'hero',alt:'Forest'}}));
 const read={journeys:async()=>({site,items:journeys}),expeditions:async()=>({site,items:[]}),guest:async(_site,id)=>{const record=f.records.find(r=>r.id===id);return {site,record:{recordId:id,revisionId:revision,name:'Anonymous guest',quote:record.payload.quote,trip:record.payload.trip,category:record.payload.guestType}};}};
 return {input,read};}
test('homepage resolves published dependencies in editorial order without exposing guest evidence',async()=>{
 const {input,read}=fixture();let active=0,max=0;const guest=read.guest;read.guest=async(...args)=>{active++;max=Math.max(active,max);try{return await guest(...args);}finally{active--;}};
 const result=await resolveHomepageDependencies(input,site,context,read);assert.equal(result.journeys[0].cards.length,3);assert.equal(result.guests[0].cards.length,6);assert.equal(result.departures[0].items.length,0);assert.ok(max<=4);assert.deepEqual(result.journeys[0].cards.map(c=>c.recordId),input.payload.composition.sections.find(s=>s.kind==='homepageJourneys').data.items.map(i=>i.recordId));
 assert.equal(JSON.stringify(result).includes('PRIVATE_CONSENT'),false);assert.equal(JSON.stringify(result).includes('PRIVATE_NAME'),false);
});
test('missing or cross-site published dependencies fail the complete result',async()=>{
 for(const change of [r=>r.journeys=async()=>({site:revision,items:[]}),r=>r.journeys=async()=>({site,items:[]}),r=>r.guest=async()=>({site,record:null}),r=>r.guest=async()=>({site:revision,record:null}),r=>r.expeditions=async()=>({site,items:[{websiteId:revision}]}),r=>r.expeditions=async()=>{throw Error('Unavailable');}]){const {input,read}=fixture();change(read);await assert.rejects(resolveHomepageDependencies(input,site,context,read));}
});
test('hidden dependency sections do not trigger public data reads',async()=>{
 const {input}=fixture();for(const section of input.payload.composition.sections)if(['homepageJourneys','homepageGuestNotes','homepageDepartures'].includes(section.kind))section.controls.visible=false;
 const fail=async()=>assert.fail('hidden section must not fetch');const result=await resolveHomepageDependencies(input,site,context,{journeys:fail,guest:fail,expeditions:fail});assert.deepEqual(result.journeys,[]);assert.deepEqual(result.guests,[]);assert.deepEqual(result.departures,[]);
});
