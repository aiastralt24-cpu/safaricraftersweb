import test from 'node:test';
import assert from 'node:assert/strict';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {projectPhotoExpeditionPreview} from '../lib/cms/photo-expedition-preview.ts';
test('expedition preview partitions dates explicitly, retains full departures and never mutates the draft',()=>{
 const value={...newPhotoExpedition(),price:'USD 4,500 + taxes',dateLabel:'Date wording is not a calendar date',departures:[{id:'later',date:'2028-03-01',status:'Full',availability:'Waitlist'},{id:'today',date:'2028-02-29',status:'Available',availability:'Ask the team'},{id:'earlier',date:'2028-02-28',endDate:'2028-03-03',status:'New',availability:''}]};const original=structuredClone(value);
 const result=projectPhotoExpeditionPreview(value,'2028-02-29');assert.deepEqual(result.upcoming.map(item=>item.id),['today','later']);assert.deepEqual(result.earlier.map(item=>item.id),['earlier']);assert.equal(result.upcoming[1].status,'Full');assert.equal(result.content.price,value.price);assert.equal(result.content.dateLabel,value.dateLabel);assert.deepEqual(value,original);
 assert.equal(projectPhotoExpeditionPreview(value,'2030-01-01').upcoming.length,0);
});
test('expedition preview rejects invalid dates and malformed payload instead of showing partial content',()=>{
 for(const date of ['2027-02-29','2028-04-31','tomorrow',''])assert.throws(()=>projectPhotoExpeditionPreview(newPhotoExpedition(),date));
 assert.throws(()=>projectPhotoExpeditionPreview({title:'Legacy partial'},'2028-02-29'));
});
