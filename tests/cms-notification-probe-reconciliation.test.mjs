import test from 'node:test';import assert from 'node:assert/strict';
import {handleProbeReconciliation,probeReconciliationRuntime} from '../lib/cms/notification-probe-reconciliation-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command={site:id(1),probeId:id(2),providerMessageId:id(3),requestId:id(4)},actor=id(5);
const message={from:'cms@example.test',to:['team@example.test'],subject:'Verification',text:'Saved verification content'};
const receipt={websiteId:id(1),probeId:id(2),providerMessageId:id(3),requestId:id(4),actorId:actor,recordedAt:new Date().toISOString()};
const intent={...receipt,firstAttemptAt:new Date(Date.now()-1000).toISOString(),message,receipt:null};delete intent.recordedAt;
const request=(body=command,headers={})=>new Request('https://cms.test/api/cms/notification-probe-reconciliation',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('verification reconciliation uses server-fetched frozen evidence and rechecks stored receipts without another lookup',async()=>{
 let reads=0,records=0;const dependencies={begin:async(token,args)=>{assert.equal(token,'a.b.c');assert.deepEqual(args,{p_site:id(1),p_probe:id(2),p_provider:id(3),p_request:id(4)});return reads?{...intent,receipt}:intent;},readEvidence:async expected=>{reads++;assert.equal(expected.dispatchId,id(2));assert.deepEqual(expected.message,message);return {verified:'synthetic'};},record:async args=>{records++;assert.equal(args.p_actor,actor);assert.deepEqual(args.p_message,message);assert.deepEqual(args.p_evidence,records===1?{verified:'synthetic'}:null);return receipt;}};
 for(let i=0;i<2;i++){const response=await handleProbeReconciliation(request(),dependencies);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(await response.json(),{result:receipt});}assert.equal(reads,1);assert.equal(records,2);
});
test('reconciliation rejects injected evidence and mismatched identities before recording acceptance',async()=>{
 const never=async()=>assert.fail('unexpected operation'),dependencies={begin:never,readEvidence:never,record:never};
 assert.equal((await handleProbeReconciliation(request(),null)).status,503);assert.equal((await handleProbeReconciliation(request(command,{Origin:'https://other.test'}),dependencies)).status,403);assert.equal((await handleProbeReconciliation(request(command,{Authorization:''}),dependencies)).status,401);
 for(const patch of [{message},{evidence:{}},{probeId:'bad'}])assert.equal((await handleProbeReconciliation(request({...command,...patch}),dependencies)).status,422);
 for(const patch of [{probeId:id(99)},{providerMessageId:id(99)},{websiteId:id(99)},{requestId:id(99)},{receipt:{...receipt,actorId:id(99)}}])assert.notEqual((await handleProbeReconciliation(request(),{...dependencies,begin:async()=>({...intent,...patch})})).status,200);
 const failed=await handleProbeReconciliation(request(),{begin:async()=>intent,readEvidence:async()=>{throw Error('private provider failure');},record:never});assert.notEqual(failed.status,200);assert.equal((await failed.text()).includes('private provider'),false);
});
test('reconciliation runtime retrieves the provider message with GET and never sends an email',async()=>{
 const env={CMS_NOTIFICATION_PROBE_RECONCILIATION_ENABLED:'true',CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'synthetic-public',CMS_SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',CMS_NOTIFICATION_RESEND_API_KEY:'synthetic-provider'};const calls=[];
 const fetcher=async(url,options)=>{const value=String(url);calls.push({url:value,method:options.method});assert.equal(options.redirect,'error');
 if(value==='https://api.resend.com/emails/'+command.providerMessageId){assert.equal(options.method,'GET');return Response.json({object:'email',id:command.providerMessageId,...message,html:null,cc:[],bcc:[],reply_to:[],scheduled_at:null,created_at:new Date().toISOString(),tags:[{name:'cms_dispatch',value:command.probeId}]});}
 if(value.endsWith('/begin_probe_reconciliation')){assert.equal(options.headers.Authorization,'Bearer a.b.c');return Response.json(intent);}
 if(value.endsWith('/record_probe_reconciliation')){assert.equal(options.headers.Authorization,'Bearer synthetic-service');const args=JSON.parse(options.body);assert.equal(args.p_evidence.dispatchId,command.probeId);assert.equal(args.p_evidence.provider,'resend');return Response.json(receipt);}
 assert.fail(value);
 };
 assert.equal((await handleProbeReconciliation(request(),probeReconciliationRuntime(env,fetcher))).status,200);assert.equal(calls.length,3);assert.deepEqual(calls.filter(v=>v.url.startsWith('https://api.resend.com')), [{url:'https://api.resend.com/emails/'+command.providerMessageId,method:'GET'}]);
 for(const patch of [{CMS_NOTIFICATION_PROBE_RECONCILIATION_ENABLED:undefined},{CMS_SUPABASE_URL:'http://db.test'},{CMS_SUPABASE_ANON_KEY:''},{CMS_SUPABASE_SERVICE_ROLE_KEY:''},{CMS_NOTIFICATION_RESEND_API_KEY:''}])assert.equal(probeReconciliationRuntime({...env,...patch},fetcher),null);
});
