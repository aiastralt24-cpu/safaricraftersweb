import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewJourneyImport} from '../lib/cms/import-review.ts';
const current={id:'10000000-0000-4000-8000-000000000001',revision:'20000000-0000-4000-8000-000000000001',slug:'forest',path:'/journeys/forest',locale:'en',title:'Original title',payload:{title:'Original title',intro:'Keep this original introduction.',sections:[{kind:'quote',text:'Keep custom sections'}],itinerary:[{itemId:'day-1',position:'1',label:'Day 1',title:'Arrival',copy:'Original day',stay:'Forest lodge'},{itemId:'day-2',position:'2',label:'Day 2',title:'Forest',copy:'Keep day 2'}]}};
function input(){return {templateVersion:'1.0',pageType:'journey',sheets:{Pages:[{recordId:current.id,operation:'update',expectedRevision:current.revision,title:'A thoughtful new title for this private forest journey',intro:''}]}};}
test('review shows actual diffs and preserves blank fields, collections and unrelated sections',()=>{
 const result=reviewJourneyImport(input(),[current]);assert.equal(result.valid,true);assert.deepEqual(result.pages[0].diffs.map(d=>d.field),['title']);assert.equal(result.manifest[0].payload.intro,current.payload.intro);assert.deepEqual(result.manifest[0].payload.sections,current.payload.sections);assert.deepEqual(result.manifest[0].payload.itinerary,current.payload.itinerary);assert.equal(result.manifest[0].expectedRevision,current.revision);assert.equal(current.payload.title,'Original title');
});
test('stable child IDs update one item and preserve omitted optional values and siblings',()=>{
 const doc=input();doc.sheets.Itinerary=[{recordId:current.id,itemId:'day-1',position:1,label:'Day 1',title:'New arrival',copy:'New description',stay:''}];const result=reviewJourneyImport(doc,[current]);assert.equal(result.valid,true);const days=result.manifest[0].payload.itinerary;assert.equal(days.length,2);assert.equal(days[0].title,'New arrival');assert.equal(days[0].stay,'Forest lodge');assert.equal(days[1].copy,'Keep day 2');assert.equal(days[0].recordId,undefined);
});
test('merged collection conflicts block all changes even when imported rows alone are valid',()=>{
 const doc=input();doc.sheets.Itinerary=[{recordId:current.id,itemId:'day-new',position:2,label:'New day',title:'New',copy:'New copy'}];const result=reviewJourneyImport(doc,[current]);assert.equal(result.valid,false);assert.deepEqual(result.manifest,[]);assert.ok(result.issues.some(i=>i.code==='merge_conflict'));
});
test('no-op updates do not create revisions or invalidate approvals',()=>{
 const doc=input();doc.sheets.Pages[0].title='Original title';const result=reviewJourneyImport(doc,[current]);assert.equal(result.valid,true);assert.equal(result.pages[0].unchanged,true);assert.deepEqual(result.manifest,[]);
});
test('manifest digest is deterministic and changes when reviewed copy changes',()=>{
 const a=reviewJourneyImport(input(),[current]);assert.equal(a.manifestSha256,reviewJourneyImport(input(),[structuredClone(current)]).manifestSha256);const doc=input();doc.sheets.Pages[0].title='Different copy';assert.notEqual(a.manifestSha256,reviewJourneyImport(doc,[current]).manifestSha256);
});
test('unreadable records and stale revisions never produce save manifests',()=>{
 assert.equal(reviewJourneyImport(input(),[]).valid,false);const newer={...current,revision:'new-revision'};assert.deepEqual(reviewJourneyImport(input(),[newer]).manifest,[]);
});
