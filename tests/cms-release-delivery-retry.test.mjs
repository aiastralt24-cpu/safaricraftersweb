import test from 'node:test';import assert from 'node:assert/strict';import {handleDeliveryRetry} from '../lib/cms/release-delivery-retry-api.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',body={site:id,request:id};
const req=(value=body,headers={})=>new Request('https://site.test/api/cms/releases/retry',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
test('delivery retry uses caller permissions and returns only confirmed bounded count',async()=>{
 let call;const response=await handleDeliveryRetry(req(),async(...args)=>{call=args;return {...body,retried:1};});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','retry_release_delivery',{p_site:id,p_request:id}]);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const result of [null,{...body,retried:51},{...body,retried:1,site:other},{...body,retried:1,secret:'hidden'}])assert.equal((await handleDeliveryRetry(req(),async()=>result)).status,503);
});
test('forged fields, missing auth and foreign origins never reach retry RPC',async()=>{
 for(const [value,headers,status] of [[{...body,job:id},{},422],[body,{Authorization:''},401],[body,{Origin:'https://foreign.test'},403]]){let calls=0;assert.equal((await handleDeliveryRetry(req(value,headers),async()=>{calls++;})).status,status);assert.equal(calls,0);}
});
