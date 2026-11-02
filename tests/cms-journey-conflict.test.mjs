import test from 'node:test';import assert from 'node:assert/strict';
import {prepareJourneyConflict} from '../lib/cms/journey-conflict.ts';
import {resolveDraftConflict} from '../lib/cms/draft-conflict.ts';
import {mergeJourneyEditorFields} from '../lib/cms/journey-editor.ts';
const base=()=>({id:'one',type:'journey',path:'/journeys/forest',locale:'en',currentRevision:'first',title:'Forest',payload:{title:'Forest',slug:'forest',intro:[{text:'Structured copy'}],faqs:[{itemId:'faq',position:1,question:'Why?',answer:'Yes'}]},permissions:{edit:true}});
test('journey conflict preserves structured local baseline and new remote fields on resave',()=>{
 const original=base(),mine={...original.payload,title:'My title'},latest={...original,title:'Remote title',currentRevision:'second',payload:{...original.payload,title:'Remote title',intro:'Remote plain copy',newField:{retained:true}}};
 const c=prepareJourneyConflict(original,mine,latest);assert.throws(()=>resolveDraftConflict(c.base,c.mine,c.remote,{}),/Choose/);
 const merged=resolveDraftConflict(c.base,c.mine,c.remote,{title:'mine',intro:'mine'});
 const saved=mergeJourneyEditorFields(merged,{title:merged.title,intro:'',description:'New summary'});
 assert.deepEqual(saved.intro,original.payload.intro);assert.deepEqual(saved.newField,{retained:true});assert.equal(saved.description,'New summary');assert.equal(saved.title,'My title');
});
test('journey conflict preserves remote removal and compares collection replacement as a whole',()=>{
 const original=base(),mine={...original.payload,faqs:[]},latest={...original,currentRevision:'second',payload:{title:'Forest',slug:'forest',faqs:[{itemId:'other',position:1}]}};
 const c=prepareJourneyConflict(original,mine,latest);assert.throws(()=>resolveDraftConflict(c.base,c.mine,c.remote,{}),/Choose/);
 const merged=resolveDraftConflict(c.base,c.mine,c.remote,{faqs:'mine'});assert.deepEqual(merged.faqs,[]);assert.equal(merged.intro,undefined);
});
test('journey comparison rejects foreign records, revoked access, stale revisions and route inconsistencies',()=>{
 const original=base(),latest={...original,currentRevision:'second'};
 for(const patch of [{id:'other'},{type:'page'},{path:'/journeys/other'},{locale:'fr'},{permissions:{edit:false}},{currentRevision:'first'},{payload:[]},{payload:{slug:'other'}}])assert.throws(()=>prepareJourneyConflict(original,original.payload,{...latest,...patch}));
});
