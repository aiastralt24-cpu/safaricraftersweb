import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareJournalConflict} from '../lib/cms/journal-conflict.ts';
import {resolveDraftConflict,compareDrafts} from '../lib/cms/draft-conflict.ts';
import {newJournalArticle} from '../lib/cms/journal.ts';
const base=()=>({id:'article',type:'journalArticle',path:'/journal/forest',locale:'en',currentRevision:'first',permissions:{edit:true},payload:{...newJournalArticle(),slug:'forest',title:'Forest'}});
test('journal reconciliation keeps independent edits and requires explicit overlapping choices',()=>{
 const original=base(),mine={...original.payload,title:'My title'},latest={...original,currentRevision:'second',payload:{...original.payload,title:'Their title',author:'New author'}};
 const conflict=prepareJournalConflict(original,mine,latest);
 assert.throws(()=>resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,{}),/Choose/);
 const merged=resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,{title:'mine'});
 assert.equal(merged.title,'My title');assert.equal(merged.author,'New author');assert.equal(original.payload.title,'Forest');
});
test('journal comparison includes newly added optional images and treats body as a whole',()=>{
 const original=base(),mine={...original.payload,body:[{id:'local',kind:'paragraph',text:'Local'}]},latest={...original,currentRevision:'second',payload:{...original.payload,body:[{id:'remote',kind:'paragraph',text:'Remote'}],image:{assetId:'11111111-1111-4111-8111-111111111111',alt:'Forest',decorative:false}}};
 const c=prepareJournalConflict(original,mine,latest);assert.equal(compareDrafts(c.base,c.mine,c.remote).find(f=>f.key==='body').conflict,true);
 const merged=resolveDraftConflict(c.base,c.mine,c.remote,{body:'mine'});assert.deepEqual(merged.body,mine.body);assert.deepEqual(merged.image,latest.payload.image);
});
test('journal reconciliation refuses identity, route, access, revision and malformed remote changes',()=>{
 const original=base(),latest={...original,currentRevision:'second'};
 for(const patch of [{id:'other'},{type:'page'},{path:'/journal/other'},{locale:'fr'},{permissions:{edit:false}},{currentRevision:'first'},{currentRevision:''},{payload:{...original.payload,slug:'other'}},{payload:{}}])assert.throws(()=>prepareJournalConflict(original,original.payload,{...latest,...patch}));
 assert.throws(()=>prepareJournalConflict(original,original.payload,null));
});
