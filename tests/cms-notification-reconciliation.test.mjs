import test from 'node:test';import assert from 'node:assert/strict';
import {handleNotificationReconciliation,notificationReconciliationRuntime} from '../lib/cms/notification-reconciliation-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command={site:id(1),leadId:id(2),jobId:id(3),dispatchId:id(4),providerMessageId:id(5),requestId:id(6)};
const message={from:'cms@example.test',to:['team@example.test'],subject:'New enquiry',text:'Private frozen message'};
const receipt={websiteId:command.site,...Object.fromEntries(Object.entries(command).filter(([key])=>key!=='site')),actorId:id(7),recordedAt:new Date().toISOString()};
const intent={...receipt,firstAttemptAt:new Date(Date.now()-60000).toISOString(),message,receipt:null};delete intent.recordedAt;
const request=(body=command,headers={})=>new Request('https://cms.example.test/api/cms/notification-reconciliation',{method:'POST',headers:{Authorization:'Bearer aaa.bbb.ccc','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('reconciliation binds user-token intent to server provider GET and service-only recording',async()=>{
 const calls=[];let saved=false;
 const runtime=notificationReconciliationRuntime({CMS_NOTIFICATION_RECONCILIATION_ENABLED:'true',CMS_SUPABASE_URL:'https://database.example.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'service-key',CMS_NOTIFICATION_RESEND_API_KEY:'provider-key'},async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).endsWith('/begin_notification_reconciliation')){assert.equal(options.headers.Authorization,'Bearer aaa.bbb.ccc');assert.equal(JSON.parse(options.body).p_request,command.requestId);return Response.json({...intent,receipt:saved?receipt:null});}
  if(String(url).startsWith('https://api.resend.com/')){assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer provider-key');return Response.json({object:'email',id:command.providerMessageId,...message,html:null,cc:[],bcc:[],reply_to:[],scheduled_at:null,created_at:intent.firstAttemptAt,tags:[{name:'cms_dispatch',value:command.dispatchId}]});}
  assert.equal(String(url),'https://database.example.test/rest/v1/rpc/record_notification_reconciliation');assert.equal(options.headers.Authorization,'Bearer service-key');const body=JSON.parse(options.body);assert.equal(body.p_actor,id(7));assert.deepEqual(body.p_message,message);if(!saved)assert.match(body.p_evidence.messageDigest,/^[a-f0-9]{64}$/);else assert.equal(body.p_evidence,null);saved=true;return Response.json(receipt);
 });
 const result=await handleNotificationReconciliation(request(),runtime);assert.equal(result.status,200);assert.deepEqual(await result.json(),{result:receipt});assert.match(result.headers.get('cache-control'),/no-store/);
 assert.equal((await handleNotificationReconciliation(request(),runtime)).status,200);assert.equal(calls.length,5);assert.equal(calls.filter(c=>c.url.startsWith('https://api.resend.com/')).length,1);assert.equal(calls.some(c=>c.url==='https://api.resend.com/emails'),false);
});
test('reconciliation rejects browser evidence, wrong scope, denied authorization and unverified provider data before recording',async()=>{
 let begins=0,reads=0,writes=0;
 const dependencies={begin:async()=>{begins++;return intent;},readEvidence:async()=>{reads++;throw Error('private provider failure');},record:async()=>{writes++;return receipt;}};
 for(const extra of [{actorId:id(7)},{message},{evidence:{} }])assert.equal((await handleNotificationReconciliation(request({...command,...extra}),dependencies)).status,422);
 assert.equal((await handleNotificationReconciliation(request(command,{Origin:'https://attacker.test'}),dependencies)).status,403);assert.equal(begins,0);
 assert.equal((await handleNotificationReconciliation(request(),null)).status,503);
 const failed=await handleNotificationReconciliation(request(),dependencies);assert.equal(failed.status,500);assert.equal(JSON.stringify(await failed.json()).includes('private provider'),false);assert.equal(reads,1);assert.equal(writes,0);
 assert.equal((await handleNotificationReconciliation(request(),{...dependencies,begin:async()=>({...intent,leadId:id(99)})})).status,500);assert.equal(reads,1);
 assert.equal((await handleNotificationReconciliation(request(),{...dependencies,begin:async()=>{throw Error('denied');}})).status,500);assert.equal(writes,0);
 assert.equal(notificationReconciliationRuntime({}),null);
});
test('client receipt verification binds all identities and excludes private fields',async()=>{
 const {verifyNotificationReconciliationReceipt}=await import('../lib/cms/notification-reconciliation.ts');
 assert.deepEqual(verifyNotificationReconciliationReceipt(receipt,command,id(7)),receipt);
 for(const key of ['websiteId','leadId','jobId','dispatchId','providerMessageId','requestId','actorId'])assert.throws(()=>verifyNotificationReconciliationReceipt({...receipt,[key]:id(99)},command,id(7)));
 assert.throws(()=>verifyNotificationReconciliationReceipt({...receipt,message},command,id(7)));
});
