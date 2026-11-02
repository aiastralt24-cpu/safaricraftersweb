import test from 'node:test';import assert from 'node:assert/strict';
import {createNotificationWorkerRpc,notificationRuntime,handleNotificationRun} from '../lib/cms/lead-notification-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={CMS_NOTIFICATION_WORKER_ENABLED:'true',CMS_NOTIFICATION_DEPLOYMENT_ID:id(99),CMS_NOTIFICATION_WORKER_SECRET:'s'.repeat(32),CMS_NOTIFICATION_RESEND_API_KEY:'synthetic-resend',CMS_NOTIFICATION_CMS_ORIGIN:'https://cms.example.test',CMS_SUPABASE_URL:'https://db.example.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'};
const request=(options={})=>new Request('https://cms.example.test/api/cms/workers/notifications',{method:'POST',headers:{Authorization:`Bearer ${env.CMS_NOTIFICATION_WORKER_SECRET}`},...options});
test('notification worker configuration and authorization block provider calls until explicitly enabled',async()=>{
 const never=async()=>assert.fail('unexpected network');for(const patch of [{CMS_NOTIFICATION_DEPLOYMENT_ID:''},{CMS_NOTIFICATION_DEPLOYMENT_ID:'invalid'},{CMS_NOTIFICATION_WORKER_ENABLED:'false'},{CMS_NOTIFICATION_WORKER_SECRET:'short'},{CMS_NOTIFICATION_RESEND_API_KEY:''},{CMS_NOTIFICATION_CMS_ORIGIN:'http://cms.test'},{CMS_SUPABASE_URL:'https://db.test/path'},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(notificationRuntime({...env,...patch},never),null);
 assert.equal((await handleNotificationRun(request(),null)).status,503);const config=notificationRuntime(env,never);
 assert.equal((await handleNotificationRun(request({headers:{Authorization:'Bearer wrong'}}),config)).status,401);
 for(const options of [{method:'GET'},{body:'{}'}])assert.equal((await handleNotificationRun(request(options),config)).status,400);
 assert.equal((await handleNotificationRun(new Request('https://cms.test/api?x=1',{method:'POST',headers:{Authorization:`Bearer ${env.CMS_NOTIFICATION_WORKER_SECRET}`}}),config)).status,400);
});
test('configured runtime executes database-to-provider flow and returns counts without private input',async()=>{
 let dispatch=null,sends=0,completed=0;const job={id:id(1),websiteId:id(2),leadId:id(3),leaseToken:id(4),attempt:1};
 const fetcher=async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');const body=JSON.parse(options.body);
 if(String(url)==='https://api.resend.com/emails'){sends++;assert.equal(options.headers.Authorization,'Bearer synthetic-resend');assert.equal(body.text.includes('private applicant'),false);return Response.json({id:id(10)});}
 assert.equal(new URL(url).origin,'https://db.example.test');assert.equal(options.headers.Authorization,'Bearer synthetic-service');const name=new URL(url).pathname.split('/').at(-1);
 const results={reap_lead_notifications:0,claim_lead_notifications:[job],get_lead_notification_input:{websiteId:id(2),leadId:id(3),formId:id(5),formRevision:id(6),formTitle:'Form',routeIds:[id(7)],answers:{name:'private applicant'},receivedAt:new Date().toISOString()},get_notification_email_route:{websiteId:id(2),routeId:id(7),revisionId:id(8),enabled:true,from:'cms@example.test',to:['team@example.test']}};
 if(name==='get_notification_dispatch')return Response.json(dispatch);
 if(name==='prepare_notification_dispatch'){dispatch={dispatchId:id(9),websiteId:id(2),jobId:id(1),routeId:id(7),routeRevision:id(8),state:'ready',idempotencyKey:`cms-notification:${id(9)}`,firstAttemptAt:new Date(Date.now()-1000).toISOString(),message:body.p_message,providerMessageId:null};return Response.json(dispatch);}
 if(name==='accept_notification_dispatch_for_deployment'){assert.equal(body.p_deployment,id(99));assert.equal(body.p_origin,env.CMS_NOTIFICATION_CMS_ORIGIN);dispatch={...dispatch,state:'accepted',message:null,providerMessageId:body.p_provider_id};return Response.json(dispatch);}
 if(name==='record_notification_worker_health'){assert.equal(body.p_deployment,id(99));assert.equal(body.p_healthy,true);return Response.json({deploymentId:body.p_deployment,cmsOrigin:body.p_origin,workerVersion:body.p_version,healthy:true,observedAt:new Date().toISOString()});}
 if(name==='finish_lead_notification'){assert.equal(body.p_success,true);completed++;return new Response(null,{status:204});}
 assert.ok(Object.hasOwn(results,name));return Response.json(results[name]);};
 const config=notificationRuntime(env,fetcher);for(let i=0;i<2;i++){const response=await handleNotificationRun(request(),config);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(await response.json(),{processed:1,reaped:0,succeeded:1,failed:0,retry_pending:0,unacknowledged:0});}assert.equal(sends,1);assert.equal(completed,2);
});
test('worker RPC rejects arbitrary operations, oversized responses and provider error details',async()=>{
 const rpc=createNotificationWorkerRpc({url:'https://db.test',serviceKey:'test'},async()=>new Response('private credentials',{status:500}));await assert.rejects(rpc('arbitrary',{}),/Invalid notification/);await assert.rejects(rpc('reap_lead_notifications',{}),error=>error.message==='Notification database operation failed.');
 const large=createNotificationWorkerRpc({url:'https://db.test',serviceKey:'test'},async()=>new Response('x'.repeat(1500001)));await assert.rejects(large('reap_lead_notifications',{}),/operation failed/);
 const config=notificationRuntime(env,async()=>{throw Error('private credentials');});const result=await handleNotificationRun(request(),config);assert.equal(result.status,503);assert.equal((await result.text()).includes('credentials'),false);
});
test('worker health is recorded after clean empty runs and failed runs but never before authorization',async()=>{
 const health=[];let fail=false;const config={secret:env.CMS_NOTIFICATION_WORKER_SECRET,adapter:{reap:async()=>0,claim:async()=>{if(fail)throw Error('private failure');return [];},read:async()=>null,deliver:async()=>{},finish:async()=>{}},reportHealth:async value=>{health.push(value);}};
 assert.equal((await handleNotificationRun(request({headers:{}}),config)).status,401);assert.deepEqual(health,[]);
 assert.equal((await handleNotificationRun(request(),config)).status,200);assert.deepEqual(health,[true]);fail=true;assert.equal((await handleNotificationRun(request(),config)).status,503);assert.deepEqual(health,[true,false]);
 fail=false;assert.equal((await handleNotificationRun(request(),{...config,reportHealth:async()=>{throw Error('health unavailable');}})).status,503);
});
test('runtime rejects stale or mismatched health receipts',async()=>{
 for(const patch of [{deploymentId:id(88)},{cmsOrigin:'https://other.example.test'},{healthy:false},{observedAt:'2020-01-01T00:00:00Z'}]){
  const runtime=notificationRuntime(env,async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1);if(name==='reap_lead_notifications')return Response.json(0);if(name==='claim_lead_notifications')return Response.json([]);assert.equal(name,'record_notification_worker_health');return Response.json({deploymentId:id(99),cmsOrigin:env.CMS_NOTIFICATION_CMS_ORIGIN,workerVersion:'notification-1',healthy:true,observedAt:new Date().toISOString(),...patch});});
  assert.equal((await handleNotificationRun(request(),runtime)).status,503);
 }
});
