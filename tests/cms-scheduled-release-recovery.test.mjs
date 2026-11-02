import test from 'node:test';import assert from 'node:assert/strict';
import {readPendingScheduledRelease,submitRecoverableScheduledRelease} from '../lib/cms/scheduled-release-recovery.ts';
const ids=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),actor=ids[0];
const request={site:ids[1],request:ids[2],items:[{record:ids[3],revision:ids[4]}],runAt:'2026-11-01T05:30:00+05:30'},normalized={...request,runAt:'2026-11-01T00:00:00.000Z'};
const receipt={result:{id:ids[5],site:request.site,request:request.request,runAt:normalized.runAt}};
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const locks={request:async(_,fn)=>fn()};const now=()=>new Date('2026-10-23T00:00:00Z');
test('lost schedule confirmation survives reload and retries the same request even after due time',async()=>{
 const storage=memory();let sent;
 const options={storage,locks,actor,request,now,send:async value=>{sent=value;assert.deepEqual(readPendingScheduledRelease(storage,actor,request.site).request,normalized);throw Error('lost');}};
 await assert.rejects(submitRecoverableScheduledRelease(options),/lost/);assert.deepEqual(sent,normalized);
 assert.equal(readPendingScheduledRelease(storage,ids[6],request.site),null);
 const result=await submitRecoverableScheduledRelease({...options,now:()=>new Date('2030-01-01'),send:async value=>{assert.deepEqual(value,normalized);return receipt;}});
 assert.deepEqual(result,receipt.result);assert.equal(storage.data.size,0);
});
test('no lock, failed storage and new past instants cannot send a schedule',async()=>{
 let calls=0;const options={storage:memory(),locks,actor,request,now,send:async()=>{calls++;return receipt;}};
 await assert.rejects(submitRecoverableScheduledRelease({...options,locks:undefined}),/Web Locks/);
 await assert.rejects(submitRecoverableScheduledRelease({...options,now:()=>new Date('2030-01-01')}),/future/);
 await assert.rejects(submitRecoverableScheduledRelease({...options,storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}),/Nothing was sent/);
 assert.equal(calls,0);
});
test('pending identity, manifest and instant cannot be replaced; bad receipts retain recovery',async()=>{
 const storage=memory(),base={storage,locks,actor,request,now,send:async()=>{throw Error('lost');}};
 await assert.rejects(submitRecoverableScheduledRelease(base));
 for(const change of [{request:ids[6]},{runAt:'2026-11-02T00:00:00Z'},{items:[{record:ids[3],revision:ids[6]}]}])await assert.rejects(submitRecoverableScheduledRelease({...base,request:{...request,...change}}),/Recover the pending/);
 for(const response of [null,{result:{...receipt.result,request:ids[6]}},{result:{...receipt.result,site:ids[6]}},{result:{...receipt.result,runAt:'2026-11-02T00:00:00Z'}},{result:{...receipt.result,token:'private'}}]){
  await assert.rejects(submitRecoverableScheduledRelease({...base,send:async()=>response}));assert.ok(readPendingScheduledRelease(storage,actor,request.site));
 }
});
test('corrupt or concurrently changed recovery is preserved',async()=>{
 const storage=memory(),base={storage,locks,actor,request,now,send:async()=>{throw Error('lost');}};
 await assert.rejects(submitRecoverableScheduledRelease(base));const [key,raw]=[...storage.data][0];
 storage.data.set(key,'{broken');assert.throws(()=>readPendingScheduledRelease(storage,actor,request.site),/invalid/);assert.equal(storage.data.get(key),'{broken');
 storage.data.set(key,raw);
 await assert.rejects(submitRecoverableScheduledRelease({...base,send:async()=>{storage.data.set(key,JSON.stringify({...JSON.parse(raw),createdAt:'2026-10-24T00:00:00Z'}));return receipt;}}),/changed during/);assert.equal(storage.data.size,1);
});
