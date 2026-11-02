import test from 'node:test';import assert from 'node:assert/strict';import {handleStandaloneDeliveryRetry} from '../lib/cms/standalone-delivery-retry-api.ts';
const site='00000000-0000-4000-8000-000000000001',job='00000000-0000-4000-8000-000000000002';
const request=(body={site,job},origin='https://cms.test')=>new Request('https://cms.test/api/cms/delivery/retry',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
test('standalone retry binds exact job receipt user token and origin',async()=>{
 const response=await handleStandaloneDeliveryRetry(request(),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'retry_standalone_delivery');assert.deepEqual(args,{p_site:site,p_job:job});return {site,job,status:'queued'};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleStandaloneDeliveryRetry(request({site,job},'https://other.test'),async()=>assert.fail())).status,403);
 assert.equal((await handleStandaloneDeliveryRetry(request({site,job,force:true}),async()=>assert.fail())).status,422);
 assert.equal((await handleStandaloneDeliveryRetry(request(),async()=>({site,job:site,status:'queued'}))).status,503);
 assert.equal((await handleStandaloneDeliveryRetry(request(),async()=>({site,job,status:'not_eligible'}))).status,200);
});
