import test from 'node:test';
import assert from 'node:assert/strict';
import {runLeadNotificationBatch} from '../lib/cms/lead-notification-worker.ts';
const job={id:'job',websiteId:'site',leadId:'lead',leaseToken:'lease',attempt:1};
const input={websiteId:'site',leadId:'lead',formId:'form',formRevision:'revision',formTitle:'Enquiry',routeIds:['approved-route'],answers:{email:'synthetic@example.test'},receivedAt:'2026-10-22T12:00:00Z'};
function adapter(patch={}){return {reap:async()=>0,claim:async()=>[job],read:async()=>input,deliver:async()=>{},finish:async()=>{},...patch};}
test('notification worker uses stable delivery key and exact lease acknowledgement',async()=>{
 let delivery,ack;const result=await runLeadNotificationBatch(adapter({deliver:async(...args)=>{delivery=args;},finish:async(...args)=>{ack=args;}}));assert.equal(result.outcomes[0].status,'succeeded');assert.deepEqual(delivery[1],{job,idempotencyKey:'lead-notification:job',timeoutMs:90000});assert.deepEqual(ack,['job','lease',true,undefined]);
});
test('missing routes and mismatched input fail closed without sending',async()=>{
 for(const value of [null,{...input,websiteId:'other'},{...input,routeIds:[]}]){let ack;const result=await runLeadNotificationBatch(adapter({read:async()=>value,deliver:async()=>assert.fail('unexpected delivery'),finish:async(...args)=>{ack=args;}}));assert.equal(result.outcomes[0].status,'retry_pending');assert.equal(ack[2],false);}
});
test('provider failure cannot erase lead or leak errors and lost acknowledgement is explicit',async()=>{
 let ack;const failed=await runLeadNotificationBatch(adapter({claim:async()=>[{...job,attempt:8}],deliver:async()=>{throw Error('secret enquiry/provider details');},finish:async(...args)=>{ack=args;}}));assert.equal(failed.outcomes[0].status,'failed');assert.equal(ack[3],'notification_delivery_failed');
 const lost=await runLeadNotificationBatch(adapter({finish:async()=>{throw Error('lease lost');}}));assert.equal(lost.outcomes[0].status,'unacknowledged');
 await assert.rejects(runLeadNotificationBatch(adapter({reap:async()=>assert.fail('should not claim')}),51),/batch size/);
});

test('career notifications pass verified historical job context and exclude raw attribution',async()=>{
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const career={recordId:id(1),revisionId:id(2),path:'/careers/guide',title:'Original guide role',organization:'Original organization',referenceCode:'G-1',formId:id(3),formRevisionId:id(4),acceptedAt:'2000-02-29T12:00:00Z'};
 const careerAttribution={career,careerSelection:{recordId:id(1),revisionId:id(2),slug:'guide'},sourcePath:'/careers/guide',internal:'never forwarded'};
 const value={...input,formId:id(3),formRevision:id(4),careerAttribution};let sent;
 assert.equal((await runLeadNotificationBatch(adapter({read:async()=>value,deliver:async v=>{sent=v;}}))).outcomes[0].status,'succeeded');assert.deepEqual(sent.career,career);assert.equal(sent.careerAttribution,undefined);assert.equal(JSON.stringify(sent).includes('never forwarded'),false);
 for(const patch of [{careerAttribution:{}},{careerAttribution:{...careerAttribution,expedition:{}}},{formRevision:id(9)},{careerAttribution:{...careerAttribution,sourcePath:'/contact'}}]){let ack;await runLeadNotificationBatch(adapter({read:async()=>({...value,...patch}),deliver:async()=>assert.fail('invalid context must not send'),finish:async(...v)=>{ack=v;}}));assert.equal(ack[2],false);assert.equal(ack[3],'notification_career_context_invalid');}
});
