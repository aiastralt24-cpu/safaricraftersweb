import test from 'node:test';import assert from 'node:assert/strict';
import {newFaq} from '../lib/cms/faqs.ts';import {prepareFaqConflict} from '../lib/cms/faq-conflict.ts';import {resolveDraftConflict} from '../lib/cms/draft-conflict.ts';
const base={id:'record',type:'faq',path:null,locale:'en',currentRevision:'old',payload:newFaq(),permissions:{edit:true}};
test('FAQ reconciliation preserves independent edits and requires a choice for competing answers',()=>{
 const mine={...newFaq(),topic:'My topic',answer:[{kind:'paragraph',text:'My answer'}]},latest={...base,currentRevision:'new',payload:{...newFaq(),internalNotes:'Reviewer note',answer:[{kind:'paragraph',text:'Latest answer'}]}};
 const c=prepareFaqConflict(base,mine,latest);assert.throws(()=>resolveDraftConflict(c.base,c.mine,c.remote,{}),/answer/);const result=resolveDraftConflict(c.base,c.mine,c.remote,{answer:'mine'});assert.equal(result.topic,'My topic');assert.equal(result.internalNotes,'Reviewer note');assert.deepEqual(result.answer,mine.answer);assert.deepEqual(base.payload,newFaq());
});
test('FAQ reconciliation rejects changed identity, scope, permissions and malformed content',()=>{
 const latest={...base,currentRevision:'new'};
 for(const patch of [{id:'other'},{type:'project'},{path:'/faq'},{locale:'fr'},{currentRevision:'old'},{permissions:{edit:false}},{payload:{question:'bad'}}])assert.throws(()=>prepareFaqConflict(base,newFaq(),{...latest,...patch}));
});
