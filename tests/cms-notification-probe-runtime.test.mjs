import test from 'node:test';import assert from 'node:assert/strict';
import {notificationProbeRuntime,handleNotificationProbe} from '../lib/cms/notification-probe-runtime.ts';
import {prepareNotificationProbeEmail} from '../lib/cms/notification-probe.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command={probeId:id(1),websiteId:id(2),routeId:id(3),routeRevision:id(4)};
const env={CMS_NOTIFICATION_PROBES_ENABLED:'true',CMS_NOTIFICATION_WORKER_ENABLED:'true',CMS_NOTIFICATION_DEPLOYMENT_ID:id(5),CMS_NOTIFICATION_WORKER_SECRET:'s'.repeat(32),CMS_NOTIFICATION_RESEND_API_KEY:'synthetic',CMS_NOTIFICATION_CMS_ORIGIN:'https://cms.example.test',CMS_SUPABASE_URL:'https://db.example.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'};
const request=(body=command,options={})=>new Request('https://cms.example.test/api/cms/workers/notification-probes',{method:'POST',headers:{Authorization:`Bearer ${env.CMS_NOTIFICATION_WORKER_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify(body),...options});
test('probe runtime requires explicit configuration and rejects unauthorized or malformed requests before network calls',async()=>{
 const never=async()=>assert.fail('unexpected network');
 for(const patch of [{CMS_NOTIFICATION_PROBES_ENABLED:undefined},{CMS_NOTIFICATION_WORKER_ENABLED:'false'},{CMS_NOTIFICATION_WORKER_SECRET:'short'},{CMS_NOTIFICATION_DEPLOYMENT_ID:'bad'},{CMS_NOTIFICATION_CMS_ORIGIN:'http://cms.test'},{CMS_NOTIFICATION_CMS_ORIGIN:'https://user@cms.test'},{CMS_NOTIFICATION_CMS_ORIGIN:'https://cms.test/path'},{CMS_SUPABASE_URL:'https://db.test/path'},{CMS_NOTIFICATION_RESEND_API_KEY:''},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(notificationProbeRuntime({...env,...patch},never),null);
 assert.equal((await handleNotificationProbe(request(),null)).status,503);
 const runtime=notificationProbeRuntime(env,never);assert.ok(runtime);
 assert.equal((await handleNotificationProbe(request(command,{headers:{}}),runtime)).status,401);
 for(const body of [{...command,from:'attacker@example.test'},{...command,deploymentId:id(9)},{...command,probeId:'bad'},'x'.repeat(5000),null])assert.equal((await handleNotificationProbe(request(body),runtime)).status,400);
 assert.equal((await handleNotificationProbe(request(command,{body:'{'}),runtime)).status,400);
});
test('probe runtime freezes through database before provider delivery, records acceptance and skips confirmed sends',async()=>{
 let stored=null,sends=0;const calls=[];
 const identity={...command,deploymentId:id(5),cmsOrigin:env.CMS_NOTIFICATION_CMS_ORIGIN};
 const fetcher=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push(String(url));assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  if(String(url)==='https://api.resend.com/emails'){sends++;assert.ok(stored);assert.equal(options.headers['Idempotency-Key'],`cms-notification:${id(1)}`);assert.deepEqual(body.to,['team@example.test']);return Response.json({id:id(8)});}
  assert.equal(new URL(url).origin,'https://db.example.test');const name=new URL(url).pathname.split('/').at(-1);assert.equal(body.p_probe,id(1));
  if(name==='claim_notification_probe'){assert.equal(body.p_deployment,id(5));assert.equal(body.p_origin,identity.cmsOrigin);return Response.json({probeId:id(1),leaseToken:id(6)});}
  assert.equal(body.p_token,id(6));
  if(name==='get_notification_probe_dispatch')return Response.json(stored);
  if(name==='prepare_notification_probe'){stored={...identity,state:'ready',firstAttemptAt:new Date(Date.now()-1000).toISOString(),idempotencyKey:`cms-notification:${id(1)}`,providerMessageId:null,message:prepareNotificationProbeEmail(identity,{websiteId:id(2),routeId:id(3),revisionId:id(4),enabled:true,from:'cms@example.test',to:['team@example.test']})};return Response.json(stored);}
  if(name==='accept_notification_probe'){stored={...stored,state:'accepted',message:null,providerMessageId:body.p_provider};return Response.json(stored);}
  assert.fail(name);
 };
 const runtime=notificationProbeRuntime(env,fetcher);
 for(let i=0;i<2;i++){const result=await handleNotificationProbe(request(),runtime);assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);assert.deepEqual(await result.json(),{accepted:true});}
 assert.equal(sends,1);assert.equal(calls.filter(v=>v.endsWith('prepare_notification_probe')).length,1);
});
test('probe claim mismatch and private upstream errors do not leak or reach the provider',async()=>{
 for(const response of [()=>Response.json({probeId:id(99),leaseToken:id(6)}),()=>Response.json({probeId:id(1),leaseToken:'invalid'}),()=>new Response('private credentials',{status:500})]){
  let calls=0;const runtime=notificationProbeRuntime(env,async(url)=>{calls++;assert.match(String(url),/claim_notification_probe$/);return response();});
  const result=await handleNotificationProbe(request(),runtime);assert.equal(result.status,503);assert.equal((await result.text()).includes('credentials'),false);assert.equal(calls,1);
 }
});
