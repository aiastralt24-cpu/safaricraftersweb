import test from 'node:test';import assert from 'node:assert/strict';
import {writeDraftCheckpoint,listDraftCheckpoints,removeDraftCheckpoint,checkpointRecoveryMode} from '../lib/cms/draft-checkpoints.ts';
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const scope={actor:ids[0],site:ids[1],record:ids[2],kind:'page',locale:'en'};
const value={version:1,scope,id:ids[3],baseRevision:ids[4],base:{title:'Saved'},draft:{title:'Unsaved'},createdAt:'2026-10-23T00:00:00Z',updatedAt:'2026-10-23T00:01:00Z'};
const locks={request:async(_,fn)=>fn()};
function memory(){const data=new Map();return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('opted-in checkpoints survive reload and isolate account, site and tab identities',async()=>{
 const storage=memory();await writeDraftCheckpoint({storage,locks,enabled:true,value});await writeDraftCheckpoint({storage,locks,enabled:true,value:{...value,id:ids[5],draft:{title:'Other tab'}}});
 assert.equal(listDraftCheckpoints(storage,scope).length,2);assert.deepEqual(listDraftCheckpoints(storage,scope).find(row=>row.id===value.id),value);
 assert.deepEqual(listDraftCheckpoints(storage,{...scope,actor:ids[6]}),[]);assert.deepEqual(listDraftCheckpoints(storage,{...scope,site:ids[6]}),[]);
 assert.equal(checkpointRecoveryMode(value,{scope,revision:ids[4],canEdit:true}),'restore-local');assert.equal(checkpointRecoveryMode(value,{scope,revision:ids[6],canEdit:true}),'compare');
 assert.throws(()=>checkpointRecoveryMode(value,{scope,revision:ids[4],canEdit:false}));assert.throws(()=>checkpointRecoveryMode(value,{scope:{...scope,record:ids[6]},revision:ids[4],canEdit:true}));
});
test('disabled recovery, unsupported locks and unconfirmed storage never report success',async()=>{
 const storage=memory();for(const patch of [{enabled:false},{locks:undefined}])await assert.rejects(writeDraftCheckpoint({storage,locks,enabled:true,value,...patch}));assert.equal(storage.length,0);
 await assert.rejects(writeDraftCheckpoint({storage:{...storage,setItem:()=>{}},locks,enabled:true,value}),/could not be confirmed/);
 await assert.rejects(writeDraftCheckpoint({storage,locks,enabled:true,value:{...value,draft:{text:'x'.repeat(2000001)}}}),/too large/);
});
test('checkpoint base cannot change and stale removal cannot delete newer edits',async()=>{
 const storage=memory();await writeDraftCheckpoint({storage,locks,enabled:true,value});
 for(const patch of [{baseRevision:ids[6]},{base:{title:'Changed base'}},{updatedAt:'2026-10-23T00:00:30Z'}])await assert.rejects(writeDraftCheckpoint({storage,locks,enabled:true,value:{...value,...patch}}));
 const updated={...value,updatedAt:'2026-10-23T00:02:00Z',draft:{title:'Newer edit'}};await writeDraftCheckpoint({storage,locks,enabled:true,value:updated});
 await assert.rejects(removeDraftCheckpoint(storage,locks,value),/changed/);assert.equal(storage.length,1);await removeDraftCheckpoint(storage,locks,updated);assert.equal(storage.length,0);
});
test('corrupt or forged local data is preserved rather than silently dropped',async()=>{
 const storage=memory();await writeDraftCheckpoint({storage,locks,enabled:true,value});const key=storage.key(0);
 for(const raw of ['{broken',JSON.stringify({...value,scope:{...scope,actor:ids[6]}}),JSON.stringify({...value,secret:'unexpected'}),JSON.stringify({...value,updatedAt:'2026-10-22T00:00:00Z'})]){storage.setItem(key,raw);assert.throws(()=>listDraftCheckpoints(storage,scope));assert.equal(storage.getItem(key),raw);}
});
