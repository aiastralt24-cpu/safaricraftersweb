import test from 'node:test';import assert from 'node:assert/strict';
import {newEvent} from '../lib/cms/events.ts';
import {publicEventConfig,readPublishedEvent,readPublishedEventList} from '../lib/cms/public-event-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_EVENTS_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const draft={...newEvent(),slug:'example',summary:'Summary',organizer:'Organizer',category:'Workshop',attendance:'online',onlineUrl:'https://example.test/event',timing:{mode:'allDay',start:'2026-10-29',end:'2026-10-29'},body:[{id:'body',kind:'paragraph',text:'Public body'}]};
const {internalNotes,relationships,...payload}=draft;
const item={recordId:id(2),revisionId:id(3),type:'event',path:'/events/example',locale:'en',payload,related:[]};
const card=(n,date='2026-10-29')=>({recordId:id(n),revisionId:id(3),path:`/events/item-${n}`,modifiedAt:'2026-10-29T10:00:00Z',title:'Example',summary:'Summary',image:null,category:'Workshop',timing:{mode:'allDay',start:date,end:date},status:'scheduled',attendance:'online',seo:draft.seo});
test('event runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicEventConfig({}),null);for(const key of Object.keys(env))assert.equal(publicEventConfig({...env,[key]:''}),null);
 const requests=[];const config=publicEventConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedEvent('example',config),null);assert.match(String(requests[0].url),/get_public_event$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/events/example',p_locale:'en'});
});
test('event detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedEvent('example',config)).content.summary,'Summary');
 assert.equal(await readPublishedEvent('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedEvent('example',null));
 for(const value of [{...item,path:'/events/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedEvent('example',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedEvent('example',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('event listing validates bounded pagination and sorts editorial dates without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,'2026-10-28');let calls=0;
 const rows=await readPublishedEventList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),timing:{mode:'allDay',start:'not-date',end:'not-date'}}]])await assert.rejects(()=>readPublishedEventList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedEventList({site,read:async()=>null,list:async()=>[]}),[]);
});

test('event list sorts timed instants across offsets and preserves inclusive all-day dates',async()=>{
 const a={...card(2),timing:{mode:'timed',start:'2026-10-29T09:00:00+05:30',end:'2026-10-29T10:00:00+05:30'}},b={...card(3),timing:{mode:'timed',start:'2026-10-29T04:00:00Z',end:'2026-10-29T05:00:00Z'}},c=card(4);
 const rows=await readPublishedEventList({site,read:async()=>null,list:async()=>[a,b,c]});assert.deepEqual(rows.map(r=>r.recordId),[c.recordId,a.recordId,b.recordId]);assert.deepEqual(rows[0].timing,c.timing);
 for(const timing of [{mode:'allDay',start:'',end:''},{mode:'timed',start:'2026-10-29T10:00:00Z',end:'2026-10-29T09:00:00Z'}])await assert.rejects(()=>readPublishedEventList({site,read:async()=>null,list:async()=>[{...c,timing}]}));
});

test('event pagination has a hard delivery cap and rejects oversized provider pages',async()=>{
 let calls=0;await assert.rejects(()=>readPublishedEventList({site,read:async()=>null,list:async()=>{const offset=calls++*100;return Array.from({length:100},(_,i)=>card(offset+i+2));}}),/delivery limit/);assert.equal(calls,100);
 await assert.rejects(()=>readPublishedEventList({site,read:async()=>null,list:async()=>Array.from({length:101},(_,i)=>card(i+2))}));
});
