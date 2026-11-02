import test from 'node:test';import assert from 'node:assert/strict';
import {verifyResendNotificationEvidence,createResendNotificationEvidenceReader} from '../lib/cms/notification-provider-evidence.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const expected={dispatchId:id(1),providerMessageId:id(2),firstAttemptAt:'2026-10-30T10:00:00Z',message:{from:'cms@example.test',to:['team@example.test'],subject:'New enquiry',text:'Frozen original message'}};
const now=Date.parse('2026-10-31T10:00:00Z');
const fixture=()=>({object:'email',id:id(2),...expected.message,html:null,cc:[],bcc:[],reply_to:[],scheduled_at:null,created_at:'2026-10-30 10:00:01.123456+00',tags:[{name:'cms_dispatch',value:id(1)}],last_event:'delivered',message_id:'provider-message-reference'});
test('provider evidence requires exact dispatch correlation, frozen content and a plausible acceptance time',()=>{
 const result=verifyResendNotificationEvidence(fixture(),expected,now);assert.equal(result.dispatchId,id(1));assert.equal(result.acceptedAt,'2026-10-30T10:00:01.123456+00:00');assert.match(result.messageDigest,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(result).includes('Frozen'),false);assert.equal(JSON.stringify(result).includes('team@example.test'),false);
 for(const mutate of [v=>v.id=id(9),v=>v.tags[0].value=id(9),v=>v.tags=[],v=>v.tags.push(v.tags[0]),v=>v.from='other@example.test',v=>v.to=['other@example.test'],v=>v.text+='changed',v=>v.subject='Changed',v=>v.cc=['other@example.test'],v=>v.bcc=['other@example.test'],v=>v.reply_to=['other@example.test'],v=>v.html='<p>Different</p>',v=>v.scheduled_at='2027-01-01',v=>v.created_at='2020-01-01T00:00:00Z',v=>v.created_at='2099-01-01T00:00:00Z',v=>v.created_at='not a time']){const value=fixture();mutate(value);assert.throws(()=>verifyResendNotificationEvidence(value,expected,now));}
});
test('evidence reader uses only fixed authenticated GET requests and hides raw provider failures',async()=>{
 let call;const read=createResendNotificationEvidenceReader('synthetic-key',async(...args)=>{call=args;return Response.json(fixture());},()=>now);assert.equal((await read(expected)).providerMessageId,id(2));assert.equal(call[0],`https://api.resend.com/emails/${id(2)}`);assert.equal(call[1].method,'GET');assert.equal(call[1].body,undefined);assert.equal(call[1].redirect,'error');assert.equal(call[1].cache,'no-store');
 for(const response of [()=>new Response('secret provider details',{status:403}),()=>new Response('x'.repeat(128001)),()=>Response.json({...fixture(),tags:[]})])await assert.rejects(createResendNotificationEvidenceReader('synthetic',async()=>response(),()=>now)(expected),error=>error.message==='Notification provider evidence could not be verified.');
 await assert.rejects(read({...expected,providerMessageId:'../send'}));assert.throws(()=>createResendNotificationEvidenceReader('bad\nkey'));
});
