import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareExpeditionConflict} from '../lib/cms/expedition-conflict.ts';
import {resolveDraftConflict,compareDrafts} from '../lib/cms/draft-conflict.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
const base=()=>({id:'article',type:'photoExpedition',path:'/photo-expeditions/forest',locale:'en',currentRevision:'first',permissions:{edit:true},payload:{...newPhotoExpedition(),slug:'forest',title:'Forest'}});
test('expedition reconciliation keeps independent edits and requires explicit overlapping choices',()=>{
 const original=base(),mine={...original.payload,title:'My title'},latest={...original,currentRevision:'second',payload:{...original.payload,title:'Their title',mentor:'New mentor'}};
 const conflict=prepareExpeditionConflict(original,mine,latest);
 assert.throws(()=>resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,{}),/Choose/);
 const merged=resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,{title:'mine'});
 assert.equal(merged.title,'My title');assert.equal(merged.mentor,'New mentor');assert.equal(original.payload.title,'Forest');
});
test('expedition comparison preserves optional media additions and selects collections whole',()=>{
 const original=base(),mine={...original.payload,highlights:[{id:'local',text:'Local'}]},latest={...original,currentRevision:'second',payload:{...original.payload,highlights:[{id:'remote',text:'Remote'}],image:{assetId:'11111111-1111-4111-8111-111111111111',alt:'Forest',decorative:false}}};
 const c=prepareExpeditionConflict(original,mine,latest);assert.equal(compareDrafts(c.base,c.mine,c.remote).find(f=>f.key==='highlights').conflict,true);
 const merged=resolveDraftConflict(c.base,c.mine,c.remote,{highlights:'mine'});assert.deepEqual(merged.highlights,mine.highlights);assert.deepEqual(merged.image,latest.payload.image);assert.ok(Object.hasOwn(c.base,'mobileHeroImage'));
});
test('expedition reconciliation refuses identity, route, access, revision and malformed remote changes',()=>{
 const original=base(),latest={...original,currentRevision:'second'};
 for(const patch of [{id:'other'},{type:'page'},{path:'/photo-expeditions/other'},{locale:'fr'},{permissions:{edit:false}},{currentRevision:'first'},{currentRevision:''},{payload:{...original.payload,slug:'other'}},{payload:{}}])assert.throws(()=>prepareExpeditionConflict(original,original.payload,{...latest,...patch}));
 assert.throws(()=>prepareExpeditionConflict(original,original.payload,null));
});
