import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';
import {readLeadershipReferences,leadershipReferenceReader} from '../lib/cms/leadership-references.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const {internalNotes,relationships,...payload}={...newLeadership(),slug:'example',role:'Director',summary:'Summary',body:[{id:'bio',kind:'paragraph',text:'Biography'}]};
const page=n=>({recordId:id(n),revisionId:id(99),type:'leadership',locale:'en',path:'/leadership/example',payload,related:[]});
test('leadership references retain selected order and omit withdrawn profiles with bounded concurrency',async()=>{
 let live=0,max=0;const reader={site:id(1),read:async(site,record)=>{assert.equal(site,id(1));live++;max=Math.max(max,live);await new Promise(r=>setTimeout(r,1));live--;return record===id(3)?null:page(Number(record.slice(-12)));}};
 const result=await readLeadershipReferences([id(8),id(3),id(2),id(7),id(4),id(6)],reader);assert.deepEqual(result.map(p=>p.recordId),[id(8),id(2),id(7),id(4),id(6)]);assert.ok(max<=5);
});
test('leadership references reject mismatched identities, private data and invalid requests',async()=>{
 for(const value of [page(3),{...page(2),payload:{...payload,internalNotes:'private'}},undefined])await assert.rejects(()=>readLeadershipReferences([id(2)],{site:id(1),read:async()=>value}));
 for(const ids of [[id(2),id(2)],Array.from({length:31},(_,i)=>id(i+2)),['invalid']])await assert.rejects(()=>readLeadershipReferences(ids,{site:id(1),read:async()=>assert.fail()}));
 await assert.rejects(()=>readLeadershipReferences([id(2)],null));await assert.rejects(()=>readLeadershipReferences([id(2)],{site:id(1),read:async()=>assert.fail()},'fr'));assert.deepEqual(await readLeadershipReferences([],null),[]);
});
test('leadership reference configuration uses anonymous no-store reads and explicit rollout',async()=>{
 assert.equal(leadershipReferenceReader({}),null);const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_LEADERSHIP_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'anon-fixture',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'};
 let request;const reader=leadershipReferenceReader(env,async(url,init)=>{request={url,init};return Response.json(page(2));});await readLeadershipReferences([id(2)],reader);assert.match(String(request.url),/get_public_leadership_reference$/);assert.equal(request.init.cache,'no-store');assert.ok(!JSON.stringify(request).includes('never-send'));
});
