import test from 'node:test';import assert from 'node:assert/strict';import {leadAnswerDisplay} from '../lib/cms/lead-answer-display.ts';
test('lead choices display pinned labels while retaining unknown answers and booleans',()=>{
 const options={camp:'Classic safari camps',luxury:'Quiet luxury'};
 assert.equal(leadAnswerDisplay('camp',options),'Classic safari camps');assert.equal(leadAnswerDisplay(['luxury','missing','camp'],options),'Quiet luxury, missing, Classic safari camps');assert.equal(leadAnswerDisplay('camp'),'camp');assert.equal(leadAnswerDisplay(true),'Yes');assert.equal(leadAnswerDisplay(false),'No');assert.equal(leadAnswerDisplay('toString',options),'toString');assert.equal(leadAnswerDisplay('camp',{camp:null}),'camp');
});
