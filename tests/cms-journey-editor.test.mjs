import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeJourneyEditorFields} from '../lib/cms/journey-editor.ts';
test('editing a scalar preserves structured and unrendered content',()=>{
 const original={title:'Old',price:{amount:1000},itinerary:[{title:'Arrival'}]};
 const result=mergeJourneyEditorFields(original,{title:'New',price:'',intro:''});
 assert.deepEqual(result,{title:'New',price:{amount:1000},itinerary:[{title:'Arrival'}]});assert.equal(original.title,'Old');
});
test('deliberately clearing a text field is retained',()=>assert.equal(mergeJourneyEditorFields({intro:'Old'},{intro:''}).intro,''));
