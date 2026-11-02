import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedJourneyList,journeyListReader} from '../lib/cms/published-journey-list.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=n=>({recordId:id(n),revisionId:id(n),path:`/journeys/journey-${n}`,modifiedAt:'2026-10-22T10:00:00Z',slug:`journey-${n}`,title:`Journey ${n}`,description:'Forest journey',region:'India',duration:'Five days',bestMonths:'Winter',hero:null});
test('catalogue reads every page in stable identity order and returns a title-sorted copy',async()=>{
 const first=Array.from({length:100},(_,i)=>row(i+1));const cursors=[];
 const result=await readPublishedJourneyList(async after=>{cursors.push(after);return after===null?first:[row(101)];});assert.equal(result.length,101);assert.deepEqual(cursors,[null,id(100)]);assert.equal(first[1].recordId,id(2));
});
test('invalid rows, repeated cursors and service errors fail instead of returning a partial catalogue',async()=>{
 for(const value of [[{...row(1),path:'/wrong'}],[row(2),row(1)],[row(1),row(1)],[{...row(1),internalNotes:'private'}]])await assert.rejects(readPublishedJourneyList(async()=>value));
 await assert.rejects(readPublishedJourneyList(async()=>{throw Error('unavailable');}),/unavailable/);assert.deepEqual(await readPublishedJourneyList(async()=>[]),[]);
});
test('configured listing fixes website locale and size with public credentials',async()=>{
 assert.throws(()=>journeyListReader({}),/not configured/);let options;
 const read=journeyListReader({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'anon'},async(_url,value)=>{options=value;return Response.json([]);});await read(id(2));assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:id(1),p_locale:'en',p_after:id(2),p_limit:100});
});
