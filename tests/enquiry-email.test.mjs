import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { formatTeamEnquiryEmail, deliverEnquiryEmails } = require('../lib/enquiry-service.ts');

const lead = {
  source:'planner', sourceType:'fixed-expedition',
  sourceLabel:'Kanha Wildlife Photography Expedition · 12 – 16 Dec 2026',
  departure:'12 – 16 Dec 2026', region:'Photo Expedition',
  name:'Test Guest', email:'guest@example.com', phone:'+91 98765 43210', city:'',
  types:['Photo-led','Small Group'], experiences:['Wildlife photography'],
  months:['12 – 16 Dec 2026'], year:'2026', nights:'To confirm', travellers:'1',
  occasion:'Photography', flexibility:'Selected departure',
  accommodation:'As per confirmed programme', investment:'Prefer to discuss',
  contactPreference:'Email', specialist:'Team', consent:true, notes:''
};

test('team email leads with contact details and hides empty/default/internal fields', () => {
  const before = JSON.stringify(lead);
  const {subject,text} = formatTeamEnquiryEmail(lead,'SC-example-reference');
  assert.equal(subject,'New enquiry: Test Guest · Kanha Wildlife Photography Expedition');
  assert.ok(text.includes('Name: Test Guest\nPhone: +91 98765 43210\nEmail: guest@example.com'));
  assert.ok(text.includes('Travellers: 1'));
  assert.equal(text.split('12 – 16 Dec 2026').length-1,1);
  for (const hidden of ['City:', 'Guest message', 'Year:', 'Duration:', 'Accommodation:', 'Budget per person:', 'source:', 'consent:', 'specialist:', 'To confirm']) assert.ok(!text.includes(hidden), hidden);
  assert.ok(text.endsWith('Reference: SC-example-reference'));
  assert.equal(JSON.stringify(lead),before);
});

test('supplied optional details appear under readable labels', () => {
  const {text}=formatTeamEnquiryEmail({...lead,city:'Mumbai',notes:'Two rooms, please.\nOne vegetarian guest.',nights:'4',investment:'US$8k-15k',accommodation:'Quiet luxury'},'SC-test');
  for(const value of ['City: Mumbai','Duration: 4 nights','Budget per person: US$8k-15k','Accommodation: Quiet luxury','Guest message\nTwo rooms, please.\nOne vegetarian guest.']) assert.ok(text.includes(value),value);
});

test('older leads omit missing phones without inventing a number; subjects stay single line', () => {
  const {subject,text}=formatTeamEnquiryEmail({...lead,name:'Test\nGuest',phone:undefined},'SC-old');
  assert.ok(!text.includes('Phone:'));
  assert.ok(!subject.includes('\n'));
});

test('contact form defaults do not masquerade as guest preferences', () => {
  const {text}=formatTeamEnquiryEmail({...lead,sourceType:'contact',sourceLabel:'Contact page',departure:undefined,months:['Flexible'],year:'Flexible',region:'Surprise me',nights:'To discuss',travellers:'To discuss',notes:'Please help plan our trip.'},'SC-contact');
  for(const hidden of ['Journey:', 'Destination:', 'Travel dates:', 'Year:', 'Safari style:', 'Occasion:', 'Preferred contact:']) assert.ok(!text.includes(hidden),hidden);
  assert.ok(text.includes('Guest message\nPlease help plan our trip.'));
});

test('notification delivery sends the curated team email and retains reply-to and idempotency', async () => {
  const savedFetch=globalThis.fetch;
  const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ENQUIRY_FROM_EMAIL','ENQUIRY_TO_EMAIL','RESEND_API_KEY'];
  const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'test',ENQUIRY_FROM_EMAIL:'from@example.test',ENQUIRY_TO_EMAIL:'team@example.test, INFO@SAFARICRAFTERS.COM, team@example.test',RESEND_API_KEY:'test'});
  let sent;
  let claimed = false;
  globalThis.fetch=async (url,options) => {
    if(String(url).includes('claim_safari_notifications')) {
      if (claimed) return Response.json([]);
      claimed = true;
      return Response.json([{id:1,enquiry_id:'SC-test',kind:'team',attempts:0,lease_token:'lease',payload:lead}]);
    }
    if(String(url)==='https://api.resend.com/emails') {sent={body:JSON.parse(options.body),headers:options.headers}; return Response.json({id:'email-test'});}
    if(String(url).includes('safari_notification_outbox')) return new Response(null,{status:204});
    throw new Error('Unexpected network request');
  };
  try {
    assert.deepEqual(await deliverEnquiryEmails(),{processed:1,failed:0});
    assert.equal(sent.body.subject,formatTeamEnquiryEmail(lead,'SC-test').subject);
    assert.equal(sent.body.text,formatTeamEnquiryEmail(lead,'SC-test').text);
    assert.equal(sent.body.reply_to,lead.email);
    assert.deepEqual(sent.body.to,['team@example.test','info@safaricrafters.com']);
    assert.equal(sent.headers['Idempotency-Key'],'SC-test-team');
  } finally {
    globalThis.fetch=savedFetch;
    for(const key of keys) {if(saved[key]===undefined) delete process.env[key]; else process.env[key]=saved[key];}
  }
});


test('one invocation delivers older queued enquiries and the current test enquiry', async () => {
  const savedFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ENQUIRY_FROM_EMAIL','ENQUIRY_TO_EMAIL','RESEND_API_KEY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'test',ENQUIRY_FROM_EMAIL:'from@example.test',ENQUIRY_TO_EMAIL:'team@example.test',RESEND_API_KEY:'test'});
  const sent = [];
  let claims = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('claim_safari_notifications')) {
      claims++;
      if (claims > 2) return Response.json([]);
      const name = claims === 1 ? 'Older guest' : 'test lead';
      return Response.json(['team','guest'].map((kind,i) => ({id:claims*2+i,enquiry_id:`SC-${claims}`,kind,attempts:1,lease_token:'lease',payload:{...lead,name}})));
    }
    if (String(url) === 'https://api.resend.com/emails') {sent.push(JSON.parse(options.body));return Response.json({id:'test'});}
    if (String(url).includes('safari_notification_outbox')) return new Response(null,{status:204});
    throw new Error('Unexpected network request');
  };
  try {
    assert.deepEqual(await deliverEnquiryEmails(), {processed:4,failed:0});
    assert.equal(claims,3);
    assert.equal(sent.length,4);
    assert.deepEqual(sent[0].to,['team@example.test','info@safaricrafters.com']);
    assert.deepEqual(sent[1].to,[lead.email]);
    assert.match(sent[2].subject,/New enquiry: test lead/);
    assert.match(sent[2].text,/Name: test lead/);
    assert.ok(!sent[2].text.includes('Older guest'));
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) {if(saved[key] === undefined) delete process.env[key];else process.env[key]=saved[key];}
  }
});
