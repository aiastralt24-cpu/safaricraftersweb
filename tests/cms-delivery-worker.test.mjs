import test from 'node:test';
import assert from 'node:assert/strict';
import {runDeliveryBatch} from '../lib/cms/delivery-worker.ts';
const job={id:'job',leaseToken:'lease',attempt:1,path:'/journeys/forest',operation:'publish'};
test('successful invalidation is acknowledged with its exact lease token',async()=>{
 const calls=[];const result=await runDeliveryBatch({reap:async()=>0,claim:async()=>[job],invalidate:async value=>calls.push(value.path),finish:async(...args)=>calls.push(args)});
 assert.deepEqual(calls,['/journeys/forest',['job','lease',true,undefined]]);assert.equal(result.outcomes[0].status,'succeeded');
});
test('failed invalidation stores only a safe code and reports retries or terminal failure',async()=>{
 const calls=[];const result=await runDeliveryBatch({reap:async()=>0,claim:async()=>[job,{...job,id:'last',attempt:8}],invalidate:async()=>{throw new Error('private upstream secret');},finish:async(...args)=>calls.push(args)});
 assert.ok(calls.every(args=>args[2]===false&&args[3]==='invalidation_failed'));assert.deepEqual(result.outcomes.map(o=>o.status),['retry_pending','failed']);
});
test('lost acknowledgement is never reported as successful delivery',async()=>{
 const result=await runDeliveryBatch({reap:async()=>1,claim:async()=>[job],invalidate:async()=>{},finish:async()=>{throw new Error('lease lost');}});
 assert.equal(result.reaped,1);assert.equal(result.outcomes[0].status,'unacknowledged');
});
