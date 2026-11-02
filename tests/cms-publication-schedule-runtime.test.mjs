import test from 'node:test';
import assert from 'node:assert/strict';
import {createScheduleRpc,scheduleRuntime,handleScheduleRun} from '../lib/cms/publication-schedule-runtime.ts';
const secret='x'.repeat(40),id='00000000-0000-4000-8000-000000000001';
const request=(options={})=>new Request('https://site.test/api/cms/workers/schedules',{headers:{Authorization:`Bearer ${secret}`},...options});
const env={CMS_SCHEDULE_WORKER_ENABLED:'true',CMS_SCHEDULE_WORKER_SECRET:secret,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'server-key'};
const job={id,site:id,record:id,revision:id,token:id,operation:'publish',runAt:'2026-10-24T00:00:00Z'};
const stored={site:id,record:id,revision:id,type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest journey',description:'A forest journey.',intro:'Walk with an expert.',region:'India',duration:'5 days',bestMonths:'November'}};
test('scheduling worker is opt-in and rejects unauthenticated or input-driven execution',async()=>{
 let calls=0;const config=scheduleRuntime(env,async()=>{calls++;return Response.json([]);});
 for(const change of [{CMS_SCHEDULE_WORKER_ENABLED:undefined},{CMS_SCHEDULE_WORKER_SECRET:'short'},{CMS_SUPABASE_URL:'http://database.test'},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(scheduleRuntime({...env,...change}),null);
 assert.equal((await handleScheduleRun(request(),null)).status,503);
 for(const token of ['',`Bearer ${'é'.repeat(40)}`,`Bearer ${'x'.repeat(41)}`])assert.equal((await handleScheduleRun(request({headers:{Authorization:token}}),config)).status,401);
 assert.equal((await handleScheduleRun(request({method:'POST',body:'{}'}),config)).status,400);
 assert.equal((await handleScheduleRun(new Request('https://site.test/run?site=forged',{headers:{Authorization:`Bearer ${secret}`}}),config)).status,400);
 assert.equal(calls,0);const result=await handleScheduleRun(request(),config);assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);
});
test('runtime validates pinned stored content before execution and returns only aggregate counts',async()=>{
 const calls=[];const config=scheduleRuntime(env,async(url,options)=>{
  const name=String(url).split('/').at(-1);calls.push([name,options]);
  if(name==='claim_publication_schedules')return Response.json([job]);
  if(name==='get_validation_input')return Response.json(stored);
  if(name==='record_validation')return new Response(null,{status:204});
  return Response.json('published');
 });
 const result=await handleScheduleRun(request(),config);assert.equal(result.status,200);
 assert.deepEqual(await result.json(),{processed:1,published:1,unpublished:0,blocked:0,retryPending:0,unacknowledged:0});
 assert.deepEqual(calls.map(c=>c[0]),['claim_publication_schedules','get_validation_input','record_validation','execute_publication_schedule']);
 assert.ok(calls.every(([,o])=>o.redirect==='error'&&o.cache==='no-store'&&o.headers.Authorization==='Bearer server-key'));
});
test('blocked and retry outcomes remain distinct; errors never expose records or service credentials',async()=>{
 for(const fail of ['blocked','retry_pending']){
  const config=scheduleRuntime(env,async url=>{const name=String(url).split('/').at(-1);if(name==='claim_publication_schedules')return Response.json([job]);if(name==='fail_publication_schedule')return Response.json(fail);throw Error('PRIVATE');});
  const result=await handleScheduleRun(request(),config);assert.equal(result.status,fail==='blocked'?200:503);
  const text=await result.text();assert.ok(!text.includes(id)&&!text.includes('PRIVATE')&&!text.includes('server-key'));
 }
 const result=await handleScheduleRun(request(),scheduleRuntime(env,async()=>{throw Error('PRIVATE');}));assert.equal(result.status,503);
});
test('transport restricts procedures, bounds response size and rejects unsafe connection URLs',async()=>{
 for(const url of ['http://database.test','https://user:password@database.test','https://database.test/path','https://database.test?x=1'])assert.throws(()=>createScheduleRpc({url,serviceKey:'key'}));
 let called=false;const rpc=createScheduleRpc({url:'https://database.test',serviceKey:'key'},async()=>{called=true;return Response.json(null);});
 await assert.rejects(rpc('publish',{}),/Invalid scheduling operation/);assert.equal(called,false);
 for(const response of [new Response('x'.repeat(1500001)),new Response(new Uint8Array([255])),new Response('not-json'),new Response('PRIVATE',{status:500})]){
  await assert.rejects(createScheduleRpc({url:'https://database.test',serviceKey:'key'},async()=>response)('claim_publication_schedules',{}),/Scheduling worker database operation failed/);
 }
});
