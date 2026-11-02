import test from 'node:test';import assert from 'node:assert/strict';
import {handleNotificationProbeAdmin} from '../lib/cms/notification-probe-admin-api.ts';
import {verifyProbeReceipt,verifyProbeStatus,verifyProbeContext} from '../lib/cms/notification-probe-admin.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command={action:'request',site:id(1),routeId:id(2),routeRevision:id(3),bindingRevision:id(4),requestId:id(5)};
const receipt={websiteId:id(1),actorId:id(6),requestId:id(5),probeId:id(7),routeId:id(2),routeRevision:id(3),bindingRevision:id(4),deploymentId:id(8),cmsOrigin:'https://cms.test',state:'pending'};
const context={websiteId:id(1),routeId:id(2),routeRevision:id(3),routeApproved:true,bindingRevision:id(4),deploymentId:id(8),cmsOrigin:'https://cms.test',workerHealthy:true};
const status={receipt,state:'ready',firstAttemptAt:null,providerMessageId:null,leaseUntil:null};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/notification-probes',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('administrator verification API binds user-token commands and reads without provider credentials',async()=>{
 const calls=[];const response=await handleNotificationProbeAdmin(request(command),async(...args)=>{calls.push(args);return receipt;});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(calls,[['a.b.c','request_notification_probe',{p_site:id(1),p_route:id(2),p_route_revision:id(3),p_binding_revision:id(4),p_request:id(5),p_action:'request'}]]);
 for(const [body,name,result] of [[{action:'context',site:id(1),routeId:id(2)},'get_notification_probe_context',context],[{action:'status',site:id(1),requestId:id(5)},'get_notification_probe_status',status],[{...command,action:'cancel'},'request_notification_probe',{...receipt,state:'cancelled'}]]){const res=await handleNotificationProbeAdmin(request(body),async(token,procedure)=>{assert.equal(token,'a.b.c');assert.equal(procedure,name);return result;});assert.equal(res.status,200);assert.deepEqual((await res.json()).result,result);}
 assert.equal((await handleNotificationProbeAdmin(request({action:'status',site:id(1),requestId:id(5)}),async()=>null)).status,404);
});
test('verification admin rejects injected destinations, cross-origin commands and mismatched receipts',async()=>{
 const never=async()=>assert.fail('unexpected RPC');for(const patch of [{from:'other@example.test'},{deploymentId:id(9)},{action:'send'},{routeRevision:'bad'}])assert.equal((await handleNotificationProbeAdmin(request({...command,...patch}),never)).status,422);
 assert.equal((await handleNotificationProbeAdmin(request(command,{Origin:'https://other.test'}),never)).status,403);assert.equal((await handleNotificationProbeAdmin(request(command,{Authorization:''}),never)).status,401);
 for(const patch of [{websiteId:id(9)},{requestId:id(9)},{routeId:id(9)},{routeRevision:id(9)},{bindingRevision:id(9)},{deploymentId:null},{cmsOrigin:'https://cms.test/path'}])assert.throws(()=>verifyProbeReceipt({...receipt,...patch},command));
 assert.throws(()=>verifyProbeStatus({...status,state:'cancelled',receipt:{...receipt,state:'cancelled'},firstAttemptAt:'2026-10-30T00:00:00Z'},id(1),id(5)));
 assert.throws(()=>verifyProbeReceipt(receipt,{...command,action:'cancel'}));assert.throws(()=>verifyProbeContext({...context,websiteId:id(9)},id(1),id(2)));
 for(const patch of [{state:'accepted'},{state:'cancelled'},{state:'in_progress'},{state:'reconciliation_required'},{providerMessageId:id(9)}])assert.throws(()=>verifyProbeStatus({...status,...patch},id(1),id(5)));
});

test('explicit execution uses only an authorized saved request and recovers accepted results without resending',async()=>{
 const execute={...command,action:'execute',confirmed:true};let stored=status,runs=0;
 const call=async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'get_notification_probe_status');assert.deepEqual(args,{p_site:command.site,p_request:command.requestId});return stored;};
 const runtime={secret:'not-returned',run:async input=>{runs++;assert.deepEqual(input,{probeId:receipt.probeId,websiteId:command.site,routeId:command.routeId,routeRevision:command.routeRevision});stored={...status,state:'accepted',firstAttemptAt:new Date().toISOString(),providerMessageId:id(10)};}};
 const result=await handleNotificationProbeAdmin(request(execute),call,runtime);assert.equal(result.status,200);assert.equal((await result.json()).result.state,'accepted');assert.equal(runs,1);
 assert.equal((await handleNotificationProbeAdmin(request(execute),call,null)).status,200);assert.equal(runs,1);
 const never=async()=>assert.fail('unexpected operation');for(const confirmed of [false,undefined])assert.equal((await handleNotificationProbeAdmin(request({...execute,confirmed}),never,{secret:'test',run:never})).status,422);
 for(const state of ['in_progress','unavailable','reconciliation_required','cancelled']){
  const value={...status,state,receipt:state==='cancelled'?{...receipt,state:'cancelled'}:receipt,firstAttemptAt:state==='reconciliation_required'?new Date().toISOString():null,leaseUntil:state==='in_progress'?new Date().toISOString():null};
  assert.equal((await handleNotificationProbeAdmin(request(execute),async()=>value,{secret:'test',run:never})).status,409);
 }
 assert.equal((await handleNotificationProbeAdmin(request(execute),async()=>null,{secret:'test',run:never})).status,404);
 assert.equal((await handleNotificationProbeAdmin(request(execute),async()=>status,null)).status,503);
});
test('execution rejects changed identities and preserves an uncertain request without starting a replacement',async()=>{
 const execute={...command,action:'execute',confirmed:true};let runs=0,calls=0;
 const runtime={secret:'test',run:async()=>{runs++;throw Error('private provider details');}};
 const result=await handleNotificationProbeAdmin(request(execute),async()=>{calls++;return status;},runtime);assert.equal(result.status,503);assert.equal((await result.text()).includes('private provider'),false);assert.equal(runs,1);assert.equal(calls,1);
 runs=0;const mismatch=await handleNotificationProbeAdmin(request(execute),async()=>({...status,receipt:{...receipt,routeRevision:id(99)}}),{secret:'test',run:async()=>{runs++;}});assert.notEqual(mismatch.status,200);assert.equal(runs,0);
 calls=0;const after=await handleNotificationProbeAdmin(request(execute),async()=>++calls===1?status:{...status,state:'accepted',receipt:{...receipt,actorId:id(99)},firstAttemptAt:new Date().toISOString(),providerMessageId:id(10)},{secret:'test',run:async()=>{runs++;}});assert.equal(after.status,503);assert.equal(runs,1);
});
