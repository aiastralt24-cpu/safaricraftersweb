import test from 'node:test';import assert from 'node:assert/strict';
import {listNewDrafts,writeNewDraft,checkNewDraft,removeNewDraft} from '../lib/cms/new-draft-checkpoints.ts';
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),scope={actor:ids[0],site:ids[1],kind:'form'},value={version:1,scope,id:ids[2],locale:'en',draft:{title:'Unsaved form',fields:[]},createdAt:'2026-10-23T00:00:00Z',updatedAt:'2026-10-23T00:00:00Z'},locks={request:async(_,fn)=>fn()};
function memory(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('new drafts have separate local identities, locale payloads and account/site/type isolation',async()=>{
 const storage=memory();await writeNewDraft({storage,locks,enabled:true,value});await writeNewDraft({storage,locks,enabled:true,value:{...value,id:ids[3],locale:'fr'}});
 assert.equal(listNewDrafts(storage,scope).length,2);for(const other of [{...scope,actor:ids[4]},{...scope,site:ids[4]},{...scope,kind:'page'}]){assert.deepEqual(listNewDrafts(storage,other),[]);assert.throws(()=>checkNewDraft(value,other));}
 assert.throws(()=>checkNewDraft({...value,record:ids[4]},scope));assert.throws(()=>checkNewDraft({...value,baseRevision:ids[4]},scope));
});
test('new draft writes require opt-in/locks, confirmation and valid bounded data',async()=>{
 const storage=memory();for(const patch of [{enabled:false},{locks:undefined},{value:{...value,updatedAt:'2026-10-22T00:00:00Z'}},{value:{...value,draft:{text:'x'.repeat(2000001)}}}])await assert.rejects(writeNewDraft({storage,locks,enabled:true,value,...patch}));
 await assert.rejects(writeNewDraft({storage:{...storage,setItem:()=>{}},locks,enabled:true,value}),/confirmed/);assert.equal(storage.length,0);
});
test('stale removal and older updates preserve newer copies; corruption fails closed',async()=>{
 const storage=memory();await writeNewDraft({storage,locks,enabled:true,value});const newer={...value,draft:{title:'Newer'},updatedAt:'2026-10-23T00:01:00Z'};await writeNewDraft({storage,locks,enabled:true,value:newer});await assert.rejects(removeNewDraft(storage,locks,value),/changed/);await assert.rejects(writeNewDraft({storage,locks,enabled:true,value}),/changed/);assert.deepEqual(listNewDrafts(storage,scope),[newer]);await removeNewDraft(storage,locks,newer);assert.equal(storage.length,0);
 await writeNewDraft({storage,locks,enabled:true,value});const key=storage.key(0);storage.setItem(key,'bad JSON');assert.throws(()=>listNewDrafts(storage,scope));assert.equal(storage.getItem(key),'bad JSON');
});
