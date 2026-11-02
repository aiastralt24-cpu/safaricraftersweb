import test from 'node:test';import assert from 'node:assert/strict';
import {preparePendingRelease,readPendingRelease,completePendingRelease} from '../lib/cms/publication-release-recovery.ts';
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const actor=ids[0],manifest={site:ids[1],request:ids[2],items:[{record:ids[3],revision:ids[4]}]},now=new Date('2026-10-23T00:00:00Z');
const response={site:manifest.site,result:{release:ids[5],request:manifest.request,items:[{...manifest.items[0],deliveryJob:ids[6]}]},deliveryStatus:'unverified'};
function memory(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('reload recovers the exact ordered manifest with no token/content and no automatic expiry',()=>{
 const storage=memory(),pending=preparePendingRelease(storage,actor,manifest,now);
 assert.deepEqual(readPendingRelease(storage,actor,manifest.site),pending);
 assert.deepEqual(preparePendingRelease(storage,actor,manifest,new Date('2030-01-01T00:00:00Z')),pending);
 assert.deepEqual(Object.keys(JSON.parse([...storage.data.values()][0])),['schemaVersion','actor','manifest','createdAt']);
 assert.equal(readPendingRelease(storage,ids[7],manifest.site),null);assert.equal(readPendingRelease(storage,actor,ids[7]),null);
});
test('unresolved requests cannot be replaced and storage failures block preparation',()=>{
 const storage=memory();preparePendingRelease(storage,actor,manifest,now);
 assert.throws(()=>preparePendingRelease(storage,actor,{...manifest,request:ids[7]},now),/Recover the pending/);
 const broken={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 assert.throws(()=>preparePendingRelease(broken,actor,manifest,now),/could not be saved/);
 assert.throws(()=>preparePendingRelease({...broken,setItem:()=>{throw Error('quota');}},actor,manifest,now),/quota/);
});
test('malformed and cross-account persisted data fail closed rather than silently disappearing',()=>{
 for(const change of [()=>'{bad',raw=>JSON.stringify({...JSON.parse(raw),actor:ids[7]}),raw=>JSON.stringify({...JSON.parse(raw),token:'SECRET'}),()=> 'x'.repeat(16001)]){
  const storage=memory();preparePendingRelease(storage,actor,manifest,now);const [key,raw]=[...storage.data][0];storage.data.set(key,change(raw));
  assert.throws(()=>readPendingRelease(storage,actor,manifest.site));assert.equal(storage.data.size,1);
 }
});
test('only exact confirmation clears pending state; unconfirmed or wrong responses preserve recovery',()=>{
 const storage=memory();preparePendingRelease(storage,actor,manifest,now);
 for(const value of [null,{...response,site:ids[7]},{...response,result:{...response.result,request:ids[7]}},{...response,result:{...response.result,items:[]}},{...response,deliveryStatus:'complete'}]){
  assert.throws(()=>completePendingRelease(storage,actor,manifest.site,value));assert.ok(readPendingRelease(storage,actor,manifest.site));
 }
 assert.deepEqual(completePendingRelease(storage,actor,manifest.site,response),response.result);assert.equal(readPendingRelease(storage,actor,manifest.site),null);
});
test('submission requires cross-tab lock and persisted request before sending; ambiguous response remains recoverable',async()=>{
 const {submitRecoverableRelease}=await import('../lib/cms/publication-release-recovery.ts');
 const storage=memory(),events=[];const locks={request:async(name,fn)=>{events.push(['locked',name]);return fn();}};
 const base={storage,locks,actor,manifest,now:()=>now,send:async request=>{events.push(['sent',request]);assert.deepEqual(readPendingRelease(storage,actor,manifest.site).manifest,manifest);throw Error('response lost');}};
 await assert.rejects(submitRecoverableRelease({...base,locks:undefined}),/Web Locks/);assert.deepEqual(events,[]);
 await assert.rejects(submitRecoverableRelease(base),/response lost/);assert.equal(events[0][0],'locked');assert.equal(events[1][0],'sent');assert.ok(readPendingRelease(storage,actor,manifest.site));
 assert.deepEqual(await submitRecoverableRelease({...base,send:async request=>{assert.deepEqual(request,manifest);return response;}}),response.result);
 assert.equal(readPendingRelease(storage,actor,manifest.site),null);
});
test('server-confirmed cancellation clears recovery; mismatched or failed confirmation preserves it',async()=>{
 const {cancelRecoverableRelease}=await import('../lib/cms/publication-release-recovery.ts');const storage=memory(),locks={request:async(_key,fn)=>fn()};
 preparePendingRelease(storage,actor,manifest,now);
 const base={storage,locks,actor,site:manifest.site,send:async()=>({site:manifest.site,result:{status:'cancelled',...manifest},deliveryStatus:'unverified'})};
 await assert.rejects(cancelRecoverableRelease({...base,send:async()=>null}));assert.ok(readPendingRelease(storage,actor,manifest.site));
 const result=await cancelRecoverableRelease(base);assert.equal(result.status,'cancelled');assert.equal(readPendingRelease(storage,actor,manifest.site),null);
 preparePendingRelease(storage,actor,manifest,now);
 assert.equal((await cancelRecoverableRelease({...base,send:async()=>({...response,result:{status:'committed',result:response.result}})})).status,'committed');
});
