import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftHistory,recordDraftChange,moveDraftHistory} from '../lib/cms/draft-history.ts';
test('section deletion, ordering and partial field edits round-trip without losing identifiers',()=>{
 const original={sections:[{id:'a',text:'First'},{id:'b',text:'Second'}]};
 let history=createDraftHistory(original);
 history=recordDraftChange(history,{sections:[original.sections[1],original.sections[0]]});
 history=recordDraftChange(history,{sections:[{id:'b',text:''}]});
 const last=history.present;
 history=moveDraftHistory(history,'undo');assert.deepEqual(JSON.parse(history.present).sections.map(s=>s.id),['b','a']);
 history=moveDraftHistory(history,'undo');assert.deepEqual(JSON.parse(history.present),original);
 history=moveDraftHistory(moveDraftHistory(history,'redo'),'redo');assert.equal(history.present,last);
});
test('new edits after undo discard the abandoned redo branch; no-op edits preserve it',()=>{
 let history=recordDraftChange(createDraftHistory({text:'a'}),{text:'b'});
 history=moveDraftHistory(history,'undo');
 assert.equal(recordDraftChange(history,{text:'a'}),history);
 history=recordDraftChange(history,{text:'c'});assert.equal(history.future.length,0);
 assert.equal(moveDraftHistory(history,'redo'),history);
});
test('snapshots do not retain mutable object references and reset starts isolated',()=>{
 const value={sections:[{id:'original'}]},history=createDraftHistory(value);
 value.sections[0].id='changed';assert.equal(JSON.parse(history.present).sections[0].id,'original');
 const reset=createDraftHistory(value);assert.equal(reset.past.length,0);assert.equal(reset.future.length,0);assert.equal(moveDraftHistory(reset,'undo'),reset);
});
test('history is bounded by step count and payload size without truncating the current draft',()=>{
 let history=createDraftHistory({n:0});for(let n=1;n<=80;n++)history=recordDraftChange(history,{n});
 assert.equal(history.past.length,50);for(let n=0;n<50;n++)history=moveDraftHistory(history,'undo');
 assert.equal(JSON.parse(history.present).n,30);
 history=createDraftHistory('a'.repeat(1_000_000));for(let n=0;n<8;n++)history=recordDraftChange(history,'b'.repeat(1_000_000)+n);
 assert.ok([...history.past,history.present,...history.future].reduce((sum,item)=>sum+item.length,0)<=4_000_000);
 const oversized='z'.repeat(4_000_001);history=recordDraftChange(history,oversized);assert.equal(JSON.parse(history.present),oversized);assert.equal(history.past.length,0);
});
