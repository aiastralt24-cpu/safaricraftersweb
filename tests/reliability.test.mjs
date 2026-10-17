import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEnquiry,acceptEnquiry,deliverEnquiryEmails,formatEnquiryEmail} from '../lib/enquiry-service.ts';
import {upcomingDepartures,departureLabel,isFeaturedExpedition} from '../lib/departures.ts';
const payload={source:'planner',name:'Test guest',email:'guest@example.test',region:'India',types:['Private'],experiences:['Open to suggestions'],months:['Flexible'],year:'Flexible',nights:'To discuss',travellers:'To discuss',occasion:'To discuss',flexibility:'To discuss',accommodation:'Not decided yet',investment:'Prefer to discuss',contactPreference:'Email',consent:true};
test('international book alerts omit safari placeholders and internal fields',()=>{
 const book={...payload,sourceType:'store-international',types:['Store purchase'],experiences:['Ghosts of the Granite Hills'],months:['As soon as available'],year:'Current',nights:'Not applicable',travellers:'Not applicable',investment:'International payment and shipping quote requested',notes:'Please contact this guest about international payment and dispatch.'};
 const email=formatEnquiryEmail(book,'SC-BOOK','team');
 assert.match(email.subject,/International book order · Test guest · Ghosts of the Granite Hills/);
 assert.match(email.text,/Book: Ghosts of the Granite Hills/);
 assert.match(email.text,/Request: International payment and shipping quote requested/);
 assert.match(email.text,/Reference: SC-BOOK/);
 assert.doesNotMatch(email.text,/sourceType|sourceLabel|consent|Not applicable|Nights:|Travellers:|Year:|city:/);
 const receipt=formatEnquiryEmail(book,'SC-BOOK','guest');
 assert.match(receipt.text,/international payment and shipping/);
 assert.doesNotMatch(receipt.text,/Journey:/);
});
test('expedition alerts preserve the request and selected dates without raw metadata',()=>{
 const notes='Price and the detailed itinerary please.\nAlso, what is included?';
 const email=formatEnquiryEmail({...payload,sourceType:'fixed-expedition',sourceLabel:'Bharatpur Photography Expedition · 23 – 26 Jan 2027',departure:'23 – 26 Jan 2027',travellers:'1',notes},'SC-TRIP','team');
 assert.match(email.text,/Dates: 23 – 26 Jan 2027/);
 assert.match(email.text,/Travellers: 1/);
 assert.ok(email.text.includes(notes));
 assert.doesNotMatch(email.text,/sourceType|expeditionSlug|consent|Prefer to discuss|To discuss/);
 const bespoke=formatEnquiryEmail({...payload,months:['January'],year:'2027',phone:'+1234567',investment:'USD 5000'},'SC-PRIVATE','team');
 assert.match(bespoke.text,/Dates: January · 2027/);
 assert.match(bespoke.text,/Phone: \+1234567/);
 assert.match(bespoke.text,/Budget: USD 5000/);
});
test('malformed field types cannot crash validation',()=>{
 for(const input of [null,[],{}, {...payload,name:42},{...payload,months:'Jan'},{...payload,consent:'true'},{...payload,notes:'a'.repeat(5001)},{...payload,website:'bot'}])assert.equal(validateEnquiry(input).ok,false);
 assert.equal(validateEnquiry(payload).ok,true);
});
test('past dates excluded; featured expired trips retired; range used consistently',()=>{
 const e={departures:[{date:'2026-01-01',status:'Full'},{date:'2027-02-10',endDate:'2027-02-14',status:'Available'},{date:'garbage',status:'Available'}]};
 assert.equal(upcomingDepartures(e,'2026-09-24').length,1);
 assert.match(departureLabel(upcomingDepartures(e,'2026-09-24')[0]),/10.*14.*2027/);
 assert.equal(isFeaturedExpedition({departures:[{date:'2000-01-01'}]}),false);
 assert.equal(isFeaturedExpedition({publicationStatus:'preview'}),false);
});
test('storage acceptance does not depend on email service; same key sent on retries',async()=>{
 const original=global.fetch;process.env.SUPABASE_URL='https://database.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test';
 const keys=[];
 global.fetch=async(url,init)=>{assert.match(url,/accept_safari_enquiry$/);keys.push(JSON.parse(init.body).p_key);return Response.json({enquiry_id:'SC-SAME',specialist:'Safari Crafters'});};
 try {const a=await acceptEnquiry(payload,'same-key'),b=await acceptEnquiry(payload,'same-key');assert.equal(a.enquiryId,b.enquiryId);assert.deepEqual(keys,['same-key','same-key']);}finally{global.fetch=original;}
});
test('database rejection cannot become a success',async()=>{
 const original=global.fetch;global.fetch=async()=>Response.json({message:'database unavailable'},{status:503});
 try{await assert.rejects(acceptEnquiry(payload,'key'));}finally{global.fetch=original;}
});
test('email failure stays queued; successful retry uses same provider key and acknowledges lease',async()=>{
 const original=global.fetch;process.env.RESEND_API_KEY='test';process.env.ENQUIRY_FROM_EMAIL='test@example.test';process.env.ENQUIRY_TO_EMAIL='team@example.test';
 let failure=true;const keys=[],patches=[];
 global.fetch=async(url,init)=>{
  if(url.includes('claim_safari_notifications'))return Response.json([{id:1,enquiry_id:'SC-TEST',kind:'team',attempts:1,lease_token:'lease',payload}]);
  if(url.includes('resend.com')){keys.push(init.headers['Idempotency-Key']);return new Response(null,{status:failure?503:200});}
  assert.match(url,/lease_token=eq.lease/);patches.push(JSON.parse(init.body));return new Response(null,{status:204});
 };
 try{assert.equal((await deliverEnquiryEmails()).failed,1);assert.ok(patches[0].next_attempt_at);assert.equal(patches[0].sent_at,undefined);failure=false;assert.equal((await deliverEnquiryEmails()).failed,0);assert.ok(patches[1].sent_at);assert.deepEqual(keys,['SC-TEST-team','SC-TEST-team']);}finally{global.fetch=original;}
});

test('chunked oversized requests are rejected before buffering the whole body',async()=>{
 const {readLimitedBody}=await import('../lib/request-body.ts');
 const request=new Request('https://example.test',{method:'POST',body:'123456'});
 await assert.rejects(readLimitedBody(request,5));
 assert.equal(await readLimitedBody(new Request('https://example.test',{method:'POST',body:'hello'}),5),'hello');
});

test('team alerts reach multiple recipients while guest receipts stay private',async()=>{
 const originalFetch=global.fetch;
 const originalRecipients=process.env.ENQUIRY_TO_EMAIL;
 process.env.ENQUIRY_TO_EMAIL='one@example.test, two@example.test,three@example.test, one@example.test, ';
 const emails=[];
 global.fetch=async(url,init)=>{
  if(url.includes('claim_safari_notifications'))return Response.json(['team','guest'].map((kind,index)=>({id:index+1,enquiry_id:'SC-MULTI',kind,attempts:1,lease_token:'lease',payload})));
  if(url.includes('resend.com')){emails.push(JSON.parse(init.body));return new Response(null,{status:200});}
  return new Response(null,{status:204});
 };
 try {
  assert.equal((await deliverEnquiryEmails()).failed,0);
  assert.deepEqual(emails[0].to,['one@example.test','two@example.test','three@example.test']);
  assert.deepEqual(emails[1].to,[payload.email]);
  assert.equal(emails[0].text,formatEnquiryEmail(payload,'SC-MULTI','team').text);
  assert.equal(emails[1].subject,formatEnquiryEmail(payload,'SC-MULTI','guest').subject);
 } finally {
  global.fetch=originalFetch;
  if(originalRecipients===undefined)delete process.env.ENQUIRY_TO_EMAIL;else process.env.ENQUIRY_TO_EMAIL=originalRecipients;
 }
});
