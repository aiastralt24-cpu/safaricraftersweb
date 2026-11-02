import test from 'node:test';
import assert from 'node:assert/strict';
import {createValidationRpc,validationRuntime,handleValidationRun} from '../lib/cms/validation-runtime.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const secret='x'.repeat(40),id='00000000-0000-4000-8000-000000000001';
const request=(options={})=>new Request('https://site.test/api/cms/workers/validation',{headers:{Authorization:`Bearer ${secret}`},...options});
test('worker is disabled by default and refuses unauthenticated, body and query-driven runs',async()=>{
 let calls=0;const config={secret,rpc:async()=>{calls++;return [];}};
 assert.equal(validationRuntime({}),null);
 assert.equal((await handleValidationRun(request(),null)).status,503);
 for(const token of ['',`Bearer ${'é'.repeat(40)}`,`Bearer ${'x'.repeat(41)}`])assert.equal((await handleValidationRun(request({headers:{Authorization:token}}),config)).status,401);
 assert.equal((await handleValidationRun(request({method:'POST',body:'{}'}),config)).status,400);
 assert.equal((await handleValidationRun(new Request('https://site.test/run?limit=999',{headers:{Authorization:`Bearer ${secret}`}}),config)).status,400);
 assert.equal(calls,0);const response=await handleValidationRun(request(),config);assert.equal(response.status,200);assert.equal(calls,1);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('configured transport handles void receipts, pins RPC operations and hides upstream failures',async()=>{
 const seen=[];const env={CMS_VALIDATION_WORKER_ENABLED:'true',CMS_VALIDATION_WORKER_SECRET:secret,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'server-key'};
 const config=validationRuntime(env,async(url,options)=>{seen.push([String(url),options]);const name=String(url).split('/').at(-1);if(name==='claim_validations')return Response.json([{id,site:id,record:id,revision:id,token:id}]);if(name==='get_validation_job_input')return Response.json({site:id,record:id,revision:id,type:'form',path:null,payload:newForm('name')});return new Response(null,{status:204});});
 const result=await handleValidationRun(request(),config);assert.equal(result.status,200);assert.deepEqual(await result.json(),{processed:1,valid:1,invalid:0,retryPending:0,unacknowledged:0});assert.equal(seen.length,3);assert.ok(seen.every(([,options])=>options.redirect==='error'&&options.cache==='no-store'&&options.headers.Authorization==='Bearer server-key'));
 const rpc=createValidationRpc({url:'https://database.test',serviceKey:'secret'},async()=>new Response('secret database error',{status:500}));
 await assert.rejects(rpc('record_validation',{}),/Invalid validation operation/);
 await assert.rejects(rpc('claim_validations',{}),error=>error.message==='Validation worker database operation failed.');
 assert.throws(()=>createValidationRpc({url:'http://database.test',serviceKey:'secret'}),/not configured/);
 assert.throws(()=>createValidationRpc({url:'https://database.test/path',serviceKey:'secret'}),/not configured/);
});
test('worker failures return retryable status without exposing records or credentials',async()=>{
 const response=await handleValidationRun(request(),{secret,rpc:async name=>{if(name==='claim_validations')return [{id,site:id,record:id,revision:id,token:id}];throw Error('private secret');}});
 assert.equal(response.status,503);const text=await response.text();assert.match(text,/unacknowledged/);assert.ok(!text.includes(id)&&!text.includes('private secret'));
});
test('database responses are bounded and malformed data never becomes a successful check',async()=>{
 for(const response of [new Response('x'.repeat(1_500_001)),new Response(new Uint8Array([0xff,0xfe])),new Response('not-json')]){
  const rpc=createValidationRpc({url:'https://database.test',serviceKey:'secret'},async()=>response);
  await assert.rejects(rpc('get_validation_job_input',{}),/database operation failed/);
 }
 const response=await handleValidationRun(request(),{secret,rpc:async()=>({unexpected:'shape'})});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'Validation worker is temporarily unavailable.'});
});
