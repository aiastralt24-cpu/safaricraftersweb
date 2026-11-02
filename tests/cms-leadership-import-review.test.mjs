import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';
import {compareLeadershipImport} from '../lib/cms/leadership-import-comparison.ts';
import {leadershipImportLinks,verifyLeadershipImportEvidence} from '../lib/cms/leadership-import-evidence.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const profile=()=>({...newLeadership(),image:{assetId:'portrait',alt:'Portrait',decorative:false},body:[{id:'image',kind:'image',image:{assetId:'body-photo',alt:'Photo',decorative:false}}],relationships:{pages:[{recordId:id}],projects:[],articles:[],documents:[]}});
test('leadership comparison shows changed private fields and explicit image removal without mutating snapshots',()=>{
 const before=profile(),after=structuredClone(before);delete after.image;after.internalNotes='Updated private note';after.links=[{label:'Contact',href:'/contact'}];
 assert.deepEqual(compareLeadershipImport(before,after).map(r=>r.field).sort(),['image','internalNotes','links']);
 assert.equal(compareLeadershipImport(before,after).find(r=>r.field==='image').after,null);
 assert.ok(before.image);assert.deepEqual(compareLeadershipImport(before,before),[]);
});
test('leadership review evidence covers exact typed references and all proposed images',()=>{
 const changes=[{importId:'profile',payload:profile()}],links=leadershipImportLinks(changes);
 assert.deepEqual({...links,assets:[...links.assets].sort()},{assets:['body-photo','portrait'],references:[{type:'page',recordId:id}]});
 const evidence={assets:links.assets.map(assetId=>({assetId,available:true})),references:[{type:'page',recordId:id,available:true,revision}]};
 assert.deepEqual(verifyLeadershipImportEvidence(changes,evidence).issues,[]);
 for(const bad of [{...evidence,assets:evidence.assets.slice(0,1)},{...evidence,references:[{...evidence.references[0],type:'project'}]},{...evidence,references:[{...evidence.references[0],revision:null}]}])assert.equal(verifyLeadershipImportEvidence(changes,bad),null);
 evidence.assets[0].available=false;evidence.references[0].available=false;evidence.references[0].revision=null;
 assert.deepEqual(verifyLeadershipImportEvidence(changes,evidence).issues.map(i=>i.code),['asset_unavailable','reference_unavailable']);
});
