import test from 'node:test';import assert from 'node:assert/strict';
import {notificationRetryCommand,verifiedNotificationRetry} from '../lib/cms/lead-notification-recovery.ts';import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,command={action:'retry_notification',site:uuid(1),lead:uuid(2),job:uuid(3),generation:2,requestId:uuid(4)},receipt={websiteId:command.site,leadId:command.lead,jobId:command.job,requestId:command.requestId,generation:3,replayed:false};
const request=body=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('notification retry receipts bind site enquiry job generation and request identity',()=>{
 assert.deepEqual(verifiedNotificationRetry(receipt,command),receipt);for(const patch of [{websiteId:uuid(9)},{leadId:uuid(9)},{jobId:uuid(9)},{requestId:uuid(9)},{generation:2}])assert.throws(()=>verifiedNotificationRetry({...receipt,...patch},command));
 assert.equal(notificationRetryCommand.safeParse({...command,generation:0}).success,false);
});
test('notification retry API rejects recipient overrides and does not acknowledge substituted receipts',async()=>{
 let called;const response=await handleLeadCommand(request(command),async(...args)=>{called=args;return receipt;});assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','retry_lead_notification',{p_site:command.site,p_lead:command.lead,p_job:command.job,p_generation:2,p_request:command.requestId}]);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const patch of [{recipient:'outside@example.test'},{generation:0},{actor:uuid(8)},{job:'bad'}])assert.equal((await handleLeadCommand(request({...command,...patch}),async()=>assert.fail('unexpected call'))).status,422);
 assert.notEqual((await handleLeadCommand(request(command),async()=>({...receipt,jobId:uuid(9)}))).status,200);
});
