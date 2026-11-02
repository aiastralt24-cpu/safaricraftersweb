import test from 'node:test';import assert from 'node:assert/strict';
import {reminderCommand,verifiedLeadReminders,verifiedReminderReceipt} from '../lib/cms/lead-reminders.ts';import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),actor=uuid(2),lead=uuid(3);
const row={id:lead,status:'new',priority:'normal',version:2,followUp:'2026-01-01T00:00:00Z',generation:2,reminderVersion:0,state:'due',snoozedUntil:null};
const result={websiteId:site,actorId:actor,scope:'mine',filter:'due',asOf:'2026-10-01T00:00:00Z',items:[row],nextCursor:null};
const command={action:'reminder',site,lead,generation:2,expected:0,operation:'acknowledge',until:null},receipt={websiteId:site,actorId:actor,leadId:lead,generation:2,version:1,state:'acknowledged',snoozedUntil:null,replayed:false};
const req=body=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('reminder evidence binds actor scope timing and strict ordered pages',()=>{
 assert.deepEqual(verifiedLeadReminders(result,site,'mine','due',null,actor),result);
 for(const patch of [{actorId:lead},{scope:'accessible'},{items:[{...row,followUp:'2099-01-01T00:00:00Z'}]},{items:[{...row,snoozedUntil:'2099-01-01T00:00:00Z'}]},{items:[row,row]},{nextCursor:lead}])assert.throws(()=>verifiedLeadReminders({...result,...patch},site,'mine','due',null,actor));
 assert.deepEqual(verifiedReminderReceipt(receipt,command,actor),receipt);for(const patch of [{actorId:lead},{generation:1},{version:2},{state:'pending'},{leadId:actor}])assert.throws(()=>verifiedReminderReceipt({...receipt,...patch},command,actor));
 assert.equal(reminderCommand.safeParse({...command,operation:'snooze'}).success,false);assert.equal(reminderCommand.safeParse({...command,until:'2026-10-02T00:00:00Z'}).success,false);
});
test('personal reminder API never accepts actor override or edits follow-up dates',async()=>{
 let called;const response=await handleLeadCommand(req(command),async(...args)=>{called=args;return receipt;});assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','set_lead_reminder',{p_site:site,p_lead:lead,p_generation:2,p_expected:0,p_action:'acknowledge',p_until:null}]);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleLeadCommand(req({action:'reminders',site}),async(token,name,args)=>{assert.equal(name,'list_lead_reminders');assert.deepEqual(args,{p_site:site,p_scope:'mine',p_filter:'due',p_after:null,p_limit:20});return result;})).status,200);
 for(const patch of [{actorId:actor},{nextFollowUp:'2099-01-01'},{expected:-1},{generation:0}])assert.equal((await handleLeadCommand(req({...command,...patch}),async()=>assert.fail('Unexpected call'))).status,422);
 assert.notEqual((await handleLeadCommand(req(command),async()=>({...receipt,version:99}))).status,200);
});
