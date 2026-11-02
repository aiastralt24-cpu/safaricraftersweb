import test from 'node:test';import assert from 'node:assert/strict';
import {prepareLeadNotificationEmail} from '../lib/cms/lead-notification-email.ts';
import {createResendNotificationTransport} from '../lib/cms/lead-notification-resend.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const route={websiteId:id(1),routeId:id(2),revisionId:id(3),enabled:true,from:'cms@example.test',to:['team@example.test']};
const input={websiteId:id(1),leadId:id(4),formId:id(5),formRevision:id(6),formTitle:'Submitted form',routeIds:[id(2)],answers:{email:'private@example.test',details:'private answer'},receivedAt:'2026-10-30T00:00:00Z'};
const message=()=>prepareLeadNotificationEmail(input,route,'https://cms.example.test');
test('notification email uses only configured recipients and keeps applicant answers in the CMS',()=>{
 const value=message();assert.deepEqual(value.to,route.to);assert.equal(value.subject,'New website enquiry');assert.equal(value.text.includes('private'),false);assert.equal(value.reply_to,undefined);
 const career={title:'Original role',organization:'Original company',referenceCode:'REF-1'};assert.match(prepareLeadNotificationEmail({...input,career},route,'https://cms.example.test').text,/Original role/);
 for(const patch of [{websiteId:id(9)},{routeId:id(9)},{enabled:false},{from:'bad\nheader@example.test'},{to:['a@example.test','A@example.test']}])assert.throws(()=>prepareLeadNotificationEmail(input,{...route,...patch},'https://cms.example.test'));
 for(const origin of ['http://cms.test','https://secret@cms.test','https://cms.test/path','https://cms.test?x=y'])assert.throws(()=>prepareLeadNotificationEmail(input,route,origin));
});
test('Resend transport pins destination, key and payload and requires a bounded acceptance receipt',async()=>{
 const now=Date.parse('2026-10-30T00:00:00Z'),request={idempotencyKey:`cms-notification:${id(8)}`,firstAttemptAt:new Date(now).toISOString(),message:message()};let calls=[];
 const send=createResendNotificationTransport('synthetic-key',async(url,options)=>{calls.push({url,options});return Response.json({id:id(7)});},()=>now);
 assert.deepEqual(await send(request),{provider:'resend',messageId:id(7)});await send(request);assert.equal(calls[0].url,'https://api.resend.com/emails');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.headers['Idempotency-Key'],request.idempotencyKey);assert.equal(calls[0].options.body,calls[1].options.body);assert.deepEqual(JSON.parse(calls[0].options.body).tags,[{name:'cms_dispatch',value:id(8)}]);
 for(const response of [()=>new Response('private provider detail',{status:401}),()=>Response.json({id:'invalid'}),()=>new Response('x'.repeat(5000)),()=>Response.json({id:id(7),secret:'unexpected'})])await assert.rejects(createResendNotificationTransport('synthetic',async()=>response(),()=>now)(request),error=>error.message==='Notification provider acceptance could not be confirmed.');
 const never=createResendNotificationTransport('synthetic',async()=>assert.fail('must not send'),()=>now);
 for(const firstAttemptAt of [new Date(now+1).toISOString(),new Date(now-86400000).toISOString(),new Date(now-86395000).toISOString()])await assert.rejects(never({...request,firstAttemptAt}),/reconciliation/);
 await assert.rejects(never({...request,idempotencyKey:'bad\nheader'}));await assert.rejects(never(request,90001));assert.throws(()=>createResendNotificationTransport('bad\nkey'));
});
