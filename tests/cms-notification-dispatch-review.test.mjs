import test from 'node:test';import assert from 'node:assert/strict';
import {verifyNotificationDispatchReview} from '../lib/cms/notification-dispatch-review.ts';
import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const item=()=>({dispatchId:id(4),routeId:id(5),routeRevision:id(6),state:'route_unavailable',firstAttemptAt:'2026-10-01T00:00:00Z',acceptedAt:null,providerMessageId:null,idempotencyKey:`cms-notification:${id(4)}`,needsReconciliation:true,from:'cms@example.test',to:['original-team@example.test']});
const fixture=()=>({websiteId:id(1),leadId:id(2),jobId:id(3),items:[item()]});
test('dispatch review binds lead/job scope and distinguishes blocked expired routes from accepted receipts',()=>{assert.equal(verifyNotificationDispatchReview(fixture(),id(1),id(2),id(3)).items[0].needsReconciliation,true);
 for(const mutate of [v=>v.websiteId=id(9),v=>v.leadId=id(9),v=>v.jobId=id(9),v=>v.items.push(item()),v=>v.items[0].message='private',v=>v.items[0].state='accepted',v=>v.items[0].state='ready',v=>v.items[0].idempotencyKey='other']){const value=fixture();mutate(value);assert.throws(()=>verifyNotificationDispatchReview(value,id(1),id(2),id(3)));}
 const accepted=fixture();Object.assign(accepted.items[0],{state:'accepted',providerMessageId:id(7),acceptedAt:'2026-10-01T00:01:00Z',needsReconciliation:false});assert.equal(verifyNotificationDispatchReview(accepted,id(1),id(2),id(3)).items[0].state,'accepted');
});
test('dispatch inspection API uses the authenticated scope and fixed read-only operation',async()=>{const req=()=>new Request('https://cms.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'notification_dispatches',site:id(1),lead:id(2),job:id(3)})});let call;
 const response=await handleLeadCommand(req(),async(...args)=>{call=args;return fixture();});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','list_lead_notification_dispatches',{p_site:id(1),p_lead:id(2),p_job:id(3)}]);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await handleLeadCommand(req(),async()=>null)).status,404);
});
