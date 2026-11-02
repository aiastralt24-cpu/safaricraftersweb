import test from 'node:test';import assert from 'node:assert/strict';
import {deliverDurableNotifications} from '../lib/cms/lead-notification-dispatch.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const job={id:id(1),websiteId:id(2),leadId:id(3),leaseToken:id(4),attempt:1};
const input={websiteId:id(2),leadId:id(3),formId:id(5),formRevision:id(6),formTitle:'Form',routeIds:[id(7),id(8)],answers:{email:'private@example.test'},receivedAt:'2026-10-30T00:00:00Z'};
function fixture(){let loseReceipt=false,clock=Date.parse('2026-10-30T00:00:00Z');const stored=new Map(),sent=[];return {stored,sent,lose:()=>loseReceipt=true,advance:()=>clock+=100000,dependencies:{cmsOrigin:'https://cms.example.test',now:()=>clock,rpc:async(name,args)=>{
 if(name==='get_notification_dispatch')return stored.get(args.p_route)??null;
 if(name==='get_notification_email_route')return {websiteId:job.websiteId,routeId:args.p_route,revisionId:id(9),enabled:true,from:'cms@example.test',to:['team@example.test']};
 if(name==='prepare_notification_dispatch'){const dispatchId=args.p_route===id(7)?id(10):id(11),value={dispatchId,websiteId:job.websiteId,jobId:job.id,routeId:args.p_route,routeRevision:args.p_revision,state:'ready',idempotencyKey:`cms-notification:${dispatchId}`,firstAttemptAt:new Date(clock).toISOString(),message:args.p_message,providerMessageId:null};stored.set(args.p_route,value);return value;}
 if(name==='accept_notification_dispatch'){if(loseReceipt){loseReceipt=false;throw Error('lost receipt write');}const value=[...stored.values()].find(v=>v.dispatchId===args.p_dispatch);const saved={...value,state:'accepted',message:null,providerMessageId:args.p_provider_id};stored.set(value.routeId,saved);return saved;}
 throw Error('unexpected RPC');},send:async(request)=>{sent.push(structuredClone(request));return {provider:'resend',messageId:id(12)};}}};}
const run=f=>deliverDurableNotifications(job,input,{timeoutMs:90000},f.dependencies);
test('durable delivery reuses frozen messages after lost receipt writes and skips accepted routes',async()=>{const f=fixture();f.lose();await assert.rejects(run(f),/lost receipt/);assert.equal(f.sent.length,1);await run(f);assert.equal(f.sent.length,3);assert.deepEqual(f.sent[0],f.sent[1]);await run(f);assert.equal(f.sent.length,3);assert.equal(f.sent.some(v=>JSON.stringify(v).includes('private@example.test')),false);});
test('revoked, expired, mismatched and malformed dispatches never reach the provider',async()=>{
 for(const patch of [{state:'route_unavailable',message:null},{state:'reconciliation_required',message:null},{websiteId:id(90)},{jobId:id(90)},{routeId:id(90)},{idempotencyKey:'forged'},{state:'accepted',providerMessageId:null}]){const f=fixture();f.lose();await assert.rejects(run(f));const original=f.stored.get(id(7));f.stored.set(id(7),{...original,...patch});const count=f.sent.length;await assert.rejects(run(f));assert.equal(f.sent.length,count);}
});
test('delivery rejects mismatched routes, altered preparation and unconfirmed receipts',async()=>{
 for(const mode of ['route','prepared','receipt']){const f=fixture(),rpc=f.dependencies.rpc;f.dependencies.rpc=async(name,args)=>{const result=await rpc(name,args);if(mode==='route'&&name==='get_notification_email_route')return {...result,routeId:id(90)};if(mode==='prepared'&&name==='prepare_notification_dispatch')return {...result,message:{...result.message,text:'Changed'}};if(mode==='receipt'&&name==='accept_notification_dispatch')return {...result,providerMessageId:id(90)};return result;};await assert.rejects(run(f));assert.equal(f.sent.length,mode==='receipt'?1:0);}
 const f=fixture(),rpc=f.dependencies.rpc;f.dependencies.rpc=async(...args)=>{const result=await rpc(...args);f.advance();return result;};await assert.rejects(run(f),/budget/);assert.equal(f.sent.length,0);
});

test('worker database adapter connects claims, durable sends and lease completion',async()=>{
 const {createLeadNotificationAdapter}=await import('../lib/cms/lead-notification-database.ts');const {runLeadNotificationBatch}=await import('../lib/cms/lead-notification-worker.ts');
 const f=fixture(),finished=[];const rpc=async(name,args)=>{if(name==='reap_lead_notifications')return 0;if(name==='claim_lead_notifications')return [job];if(name==='get_lead_notification_input')return input;if(name==='finish_lead_notification'){finished.push(args);return null;}return f.dependencies.rpc(name,args);};
 const adapter=createLeadNotificationAdapter(rpc,f.dependencies);const result=await runLeadNotificationBatch(adapter);assert.equal(result.outcomes[0].status,'succeeded');assert.equal(f.sent.length,2);assert.deepEqual(finished,[{p_job:job.id,p_token:job.leaseToken,p_success:true,p_error_code:null}]);
 await runLeadNotificationBatch(adapter);assert.equal(f.sent.length,2);
 const bad=createLeadNotificationAdapter(async(name)=>name==='claim_lead_notifications'?[job,job]:0,f.dependencies);await assert.rejects(bad.claim(10,120),/Duplicate/);
});
