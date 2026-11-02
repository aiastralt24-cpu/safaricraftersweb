import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNotificationProbeEmail,deliverNotificationProbe} from '../lib/cms/notification-probe.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const identity={probeId:id(1),websiteId:id(2),routeId:id(3),routeRevision:id(4),deploymentId:id(5),cmsOrigin:'https://cms.example.test'};
const route={websiteId:id(2),routeId:id(3),revisionId:id(4),enabled:true,from:'cms@example.test',to:['team@example.test']};
function fixture(){
 let stored=null,clock=Date.parse('2026-10-30T00:00:00Z'),lose=false;
 const sent=[],counts={read:0,prepare:0,accept:0};
 const f={sent,counts,get stored(){return stored;},set stored(v){stored=v;},lose:()=>lose=true,advance:ms=>clock+=ms};
 f.dependencies={now:()=>clock,read:async()=>{counts.read++;return stored;},prepare:async()=>{
  counts.prepare++;stored={...identity,state:'ready',firstAttemptAt:new Date(clock).toISOString(),idempotencyKey:`cms-notification:${identity.probeId}`,message:prepareNotificationProbeEmail(identity,route),providerMessageId:null};return stored;
 },send:async request=>{sent.push(structuredClone(request));return {provider:'resend',messageId:id(6)};},accept:async(_,providerMessageId)=>{
  counts.accept++;if(lose){lose=false;throw Error('lost write');}stored={...stored,state:'accepted',message:null,providerMessageId};return stored;
 }};
 return f;
}
test('verification messages identify setup checks and reject arbitrary route or origin substitutions',()=>{
 const message=prepareNotificationProbeEmail(identity,route);
 assert.deepEqual(message.to,route.to);assert.match(message.text,/not a customer enquiry or job application/);assert.match(message.text,/Provider acceptance alone does not confirm inbox delivery/);assert.match(message.text,/https:\/\/cms.example.test\/cms/);
 for(const patch of [{websiteId:id(9)},{routeId:id(9)},{revisionId:id(9)},{enabled:false},{to:['a@example.test','A@example.test']},{from:'bad\n@example.test'}])assert.throws(()=>prepareNotificationProbeEmail(identity,{...route,...patch}));
 for(const cmsOrigin of ['http://cms.test','https://cms.test/path','https://user@cms.test','https://cms.test?x=1','https://cms.test/'])assert.throws(()=>prepareNotificationProbeEmail({...identity,cmsOrigin},route));
 assert.throws(()=>prepareNotificationProbeEmail({...identity,answers:{private:'data'}},route));
});
test('probe persists before sending, reuses the frozen key after lost writes and skips accepted delivery',async()=>{
 const f=fixture();f.lose();await assert.rejects(deliverNotificationProbe(identity,f.dependencies),/lost write/);
 assert.equal(f.counts.prepare,1);assert.equal(f.sent.length,1);
 await deliverNotificationProbe(identity,f.dependencies);assert.deepEqual(f.sent[1],f.sent[0]);assert.equal(f.counts.prepare,1);
 await deliverNotificationProbe(identity,f.dependencies);assert.equal(f.sent.length,2);assert.equal(f.counts.accept,2);
 const g=fixture();g.dependencies.prepare=async()=>{throw Error('storage unavailable');};await assert.rejects(deliverNotificationProbe(identity,g.dependencies));assert.equal(g.sent.length,0);
});
test('revoked, expired, cross-deployment and altered probe data cannot send',async()=>{
 const patches=[{state:'unavailable',message:null},{state:'reconciliation_required',message:null},{deploymentId:id(9)},{websiteId:id(9)},{routeId:id(9)},{routeRevision:id(9)},{probeId:id(9)},{cmsOrigin:'https://other.test'},{idempotencyKey:'forged'},{state:'accepted',message:null,providerMessageId:null}];
 for(const patch of patches){const f=fixture();await f.dependencies.prepare();f.stored={...f.stored,...patch};await assert.rejects(deliverNotificationProbe(identity,f.dependencies));assert.equal(f.sent.length,0);}
 for(const patch of [{subject:'Customer enquiry'},{text:'Changed contents'},{to:['bad\n@example.test']}]){const f=fixture();await f.dependencies.prepare();f.stored={...f.stored,message:{...f.stored.message,...patch}};await assert.rejects(deliverNotificationProbe(identity,f.dependencies));assert.equal(f.sent.length,0);}
 for(const age of [-1,86400000,86395000]){const f=fixture();await f.dependencies.prepare();f.advance(age);await assert.rejects(deliverNotificationProbe(identity,f.dependencies),/reconciliation/);assert.equal(f.sent.length,0);}
});
test('probe rejects mismatched acceptance and records provider success even after the budget expires',async()=>{
 for(const patch of [{providerMessageId:id(9)},{deploymentId:id(9)},{routeRevision:id(9)},{firstAttemptAt:'2026-10-29T00:00:00Z'}]){const f=fixture(),accept=f.dependencies.accept;f.dependencies.accept=async(...args)=>({...await accept(...args),...patch});await assert.rejects(deliverNotificationProbe(identity,f.dependencies));assert.equal(f.sent.length,1);}
 const f=fixture(),send=f.dependencies.send;f.dependencies.send=async(...args)=>{const result=await send(...args);f.advance(100000);return result;};assert.equal((await deliverNotificationProbe(identity,f.dependencies)).state,'accepted');
 const g=fixture(),read=g.dependencies.read;g.dependencies.read=async(...args)=>{const result=await read(...args);g.advance(100000);return result;};await assert.rejects(deliverNotificationProbe(identity,g.dependencies),/budget/);assert.equal(g.sent.length,0);assert.equal(g.counts.prepare,0);
});
