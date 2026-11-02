import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublishedJourney,readPublishedJourney,publishedMediaUrl} from '../lib/cms/published-journey.ts';
const id='00000000-0000-4000-8000-000000000001';
const payload={slug:'forest',title:'Forest journey',description:'Explore a forest.',intro:'Walk with an expert.',region:'India',duration:'5 days',bestMonths:'November',itinerary:[{itemId:'second',position:'2',label:'Day 2',title:'Explore',copy:'Explore quietly.'},{itemId:'first',position:'1',label:'Day 1',title:'Arrival',copy:'Meet your guide.'}]};
const page={recordId:id,revisionId:id,type:'journey',payload};
test('journey projection preserves published content and orders itinerary without mutating source',()=>{
 const original=structuredClone(page);const journey=parsePublishedJourney(page,'forest');assert.deepEqual(journey.itinerary.map(v=>v.itemId),['first','second']);assert.deepEqual(page,original);assert.deepEqual(journey.faqs,[]);assert.equal(publishedMediaUrl('image-1'),'/api/cms/published/media/image-1');assert.throws(()=>publishedMediaUrl('../private'));
});
test('CMS journey loading never falls back when missing, malformed or unavailable',async()=>{
 const config={site:id,read:async()=>page};assert.equal((await readPublishedJourney('forest',config)).title,payload.title);
 assert.equal(await readPublishedJourney('forest',{...config,read:async()=>null}),null);
 assert.equal(await readPublishedJourney('../forest',config),null);
 await assert.rejects(readPublishedJourney('forest',null),/not configured/);
 await assert.rejects(readPublishedJourney('forest',{...config,read:async()=>({...page,payload:{...payload,slug:'other'}})}));
 await assert.rejects(readPublishedJourney('forest',{...config,read:async()=>{throw Error('database unavailable');}}),/database unavailable/);
});
