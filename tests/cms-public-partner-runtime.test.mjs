import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';
import {publicPartnerConfig,readPublishedPartner,readPublishedPartnerList} from '../lib/cms/public-partner-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_PARTNER_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const draft={...newPartner(),slug:'example',summary:'Summary',services:['Repairs'],coverage:[{countryCode:'IN',regions:[]}],contact:{email:'support@example.com',phone:'',website:''},body:[{id:'body',kind:'paragraph',text:'Public body'}]};
const {internalNotes,relationships,...payload}=draft;
const item={recordId:id(2),revisionId:id(3),type:'partner',path:'/partners/example',locale:'en',payload,related:[]};
const card=(n,order=10)=>({recordId:id(n),revisionId:id(3),path:`/partners/item-${n}`,modifiedAt:'2026-10-29T10:00:00Z',title:order===0?'A first':'Example',summary:'Summary',image:null,kind:'dealer',seo:draft.seo});
test('partner runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicPartnerConfig({}),null);for(const key of Object.keys(env))assert.equal(publicPartnerConfig({...env,[key]:''}),null);
 const requests=[];const config=publicPartnerConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedPartner('example',config),null);assert.match(String(requests[0].url),/get_public_partner$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/partners/example',p_locale:'en'});
});
test('partner detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedPartner('example',config)).content.summary,'Summary');
 assert.equal(await readPublishedPartner('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedPartner('example',null));
 for(const value of [{...item,path:'/partners/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedPartner('example',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedPartner('example',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('partner listing validates bounded pagination and sorts display order without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,0);let calls=0;
 const rows=await readPublishedPartnerList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),kind:'industry'}]])await assert.rejects(()=>readPublishedPartnerList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedPartnerList({site,read:async()=>null,list:async()=>[]}),[]);
});

test('partner pagination has a hard delivery cap and rejects oversized provider pages',async()=>{
 let calls=0;await assert.rejects(()=>readPublishedPartnerList({site,read:async()=>null,list:async()=>{const offset=calls++*100;return Array.from({length:100},(_,i)=>card(offset+i+2));}}),/delivery limit/);assert.equal(calls,100);
 await assert.rejects(()=>readPublishedPartnerList({site,read:async()=>null,list:async()=>Array.from({length:101},(_,i)=>card(i+2))}));
});

test('partner directory accepts all kinds by default and enforces explicit kind filters',async()=>{
 const row={...card(2),kind:'servicePartner'};
 assert.equal((await readPublishedPartnerList({site,read:async()=>null,list:async(_,kind)=>{assert.equal(kind,null);return [row];}})).length,1);
 assert.equal((await readPublishedPartnerList({site,read:async()=>null,list:async()=>[row]},'servicePartner')).length,1);
 await assert.rejects(()=>readPublishedPartnerList({site,read:async()=>null,list:async()=>[row]},'dealer'));
 const requests=[];const config=publicPartnerConfig(env,async(url,init)=>{requests.push({url,init});return Response.json([]);});assert.deepEqual(await readPublishedPartnerList(config,'servicePartner'),[]);assert.match(String(requests[0].url),/list_published_partners$/);assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_after:null,p_limit:100,p_kind:'servicePartner'});assert.equal(requests[0].init.cache,'no-store');
});
