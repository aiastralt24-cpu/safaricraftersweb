import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledReleaseRuntime,handleScheduledReleaseRun} from '../lib/cms/scheduled-release-runtime.ts';
import {createScheduledReleaseRpc} from '../lib/cms/publication-schedule-runtime.ts';
const secret='g'.repeat(40),id='00000000-0000-4000-8000-000000000001';
const env={CMS_RELEASE_SCHEDULE_WORKER_ENABLED:'true',CMS_RELEASE_SCHEDULE_WORKER_SECRET:secret,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'private-key'};
const request=(options={})=>new Request('https://site.test/api/cms/workers/release-schedules',{headers:{Authorization:`Bearer ${secret}`},...options});
const job={id,token:id,site:id,request:id,items:[{record:id,revision:id}]};
const stored={site:id,record:id,revision:id,type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest',description:'A forest journey.',intro:'Explore the forest.',region:'India',duration:'5 days',bestMonths:'November'}};
test('group worker requires its own opt-in secret and rejects caller-driven execution',async()=>{
 let calls=0;const config=scheduledReleaseRuntime(env,async()=>{calls++;return Response.json(null);});
 for(const change of [{CMS_RELEASE_SCHEDULE_WORKER_ENABLED:'false'},{CMS_RELEASE_SCHEDULE_WORKER_SECRET:''},{CMS_RELEASE_SCHEDULE_WORKER_SECRET:'short'},{CMS_SUPABASE_URL:'http://database.test'},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(scheduledReleaseRuntime({...env,...change}),null);
 assert.equal((await handleScheduledReleaseRun(request(),null)).status,503);
 for(const value of ['',`Bearer ${'é'.repeat(40)}`,`Bearer ${'x'.repeat(40)}`])assert.equal((await handleScheduledReleaseRun(request({headers:{Authorization:value}}),config)).status,401);
 for(const req of [request({method:'POST',body:'{}'}),request({method:'DELETE'}),new Request('https://site.test/run?site=forged',{headers:{Authorization:`Bearer ${secret}`}})])assert.equal((await handleScheduledReleaseRun(req,config)).status,400);
 assert.equal(calls,0);
 const result=await handleScheduledReleaseRun(request(),config);assert.equal(result.status,200);assert.deepEqual(await result.json(),{processed:0,status:'idle'});assert.match(result.headers.get('cache-control'),/no-store/);
});
test('group runtime validates the pinned revision before execution and exposes no private job fields',async()=>{
 const calls=[];const config=scheduledReleaseRuntime(env,async(url,options)=>{
  const name=String(url).split('/').at(-1);calls.push([name,options]);
  if(name==='claim_scheduled_release')return Response.json(job);
  if(name==='get_validation_input')return Response.json(stored);
  if(name==='record_validation')return new Response(null,{status:204});
  return Response.json('published');
 });
 const result=await handleScheduledReleaseRun(request(),config);assert.equal(result.status,200);assert.deepEqual(await result.json(),{processed:1,status:'published'});
 assert.deepEqual(calls.map(c=>c[0]),['claim_scheduled_release','get_validation_input','record_validation','execute_scheduled_release']);
 assert.ok(calls.every(([,o])=>o.redirect==='error'&&o.cache==='no-store'&&o.headers.Authorization==='Bearer private-key'&&o.signal));
});
test('group validation failures never publish and lost acknowledgements request retry',async()=>{
 for(const outcome of ['blocked','retry_pending','lost']){
  const calls=[];const config=scheduledReleaseRuntime(env,async url=>{
   const name=String(url).split('/').at(-1);calls.push(name);
   if(name==='claim_scheduled_release')return Response.json(job);
   if(name==='fail_scheduled_release'&&outcome!=='lost')return Response.json(outcome);
   throw Error('PRIVATE');
  });
  const result=await handleScheduledReleaseRun(request(),config);assert.equal(result.status,outcome==='blocked'?200:503);
  assert.deepEqual(await result.json(),{processed:1,status:outcome==='lost'?'unacknowledged':outcome});assert.ok(!calls.includes('execute_scheduled_release'));
 }
 const result=await handleScheduledReleaseRun(request(),scheduledReleaseRuntime(env,async()=>{throw Error('PRIVATE');}));assert.equal(result.status,503);assert.ok(!(await result.text()).includes('PRIVATE'));
});
test('group transport cannot invoke individual scheduling or arbitrary publication procedures',async()=>{
 let calls=0;const call=createScheduledReleaseRpc({url:'https://database.test',serviceKey:'key'},async()=>{calls++;return Response.json(null);});
 for(const name of ['publish_release','claim_publication_schedules','execute_publication_schedule'])await assert.rejects(call(name,{}),/Invalid scheduling operation/);
 assert.equal(calls,0);
});
test('execution deadline stops further database calls and leaves lease recovery authoritative',async(t)=>{
 t.mock.timers.enable({apis:['Date'],now:0});const calls=[];
 const config={secret,call:async name=>{calls.push(name);t.mock.timers.tick(240001);return job;}};
 const result=await handleScheduledReleaseRun(request(),config);
 assert.equal(result.status,503);assert.deepEqual(await result.json(),{processed:1,status:'unacknowledged'});
 assert.deepEqual(calls,['claim_scheduled_release']);
});
