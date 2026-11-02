import test from 'node:test';import assert from 'node:assert/strict';
import {compareDrafts,resolveDraftConflict} from '../lib/cms/draft-conflict.ts';
test('independent edits merge while concurrent changes require explicit choices',()=>{
 const base={title:'Original',seo:{title:'Old'},page:{sections:['a','b']}},mine={...base,title:'Mine',page:{sections:['b']}},latest={...base,seo:{title:'Remote'},page:{sections:['a','c']}};
 assert.deepEqual(compareDrafts(base,mine,latest).filter(f=>f.conflict).map(f=>f.key),['page']);
 assert.throws(()=>resolveDraftConflict(base,mine,latest,{}),/Choose/);
 const merged=resolveDraftConflict(base,mine,latest,{page:'latest'});
 assert.deepEqual(merged,{title:'Mine',seo:{title:'Remote'},page:{sections:['a','c']}});
 merged.page.sections.push('d');assert.equal(latest.page.sections.length,2);
});
test('equal concurrent changes need no decision and explicit choices remain respected',()=>{
 const base={title:'a',menu:null},mine={title:'b',menu:null},latest={title:'b',menu:null};
 assert.equal(compareDrafts(base,mine,latest).some(f=>f.conflict),false);
 assert.deepEqual(resolveDraftConflict(base,mine,latest,{}),mine);
 assert.deepEqual(resolveDraftConflict(base,{title:'a',menu:null},latest,{title:'mine'}),base);
});
test('deletions and empty values are meaningful changes',()=>{
 const base={items:['one'],title:'Old'},mine={items:[],title:''},latest={items:['two'],title:'Remote'};
 assert.equal(compareDrafts(base,mine,latest).filter(f=>f.conflict).length,2);
 assert.deepEqual(resolveDraftConflict(base,mine,latest,{items:'mine',title:'mine'}),mine);
});
