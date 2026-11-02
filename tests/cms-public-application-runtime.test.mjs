import test from 'node:test';import assert from 'node:assert/strict';
import {newApplication} from '../lib/cms/applications.ts';
import {publicApplicationConfig,readPublishedApplication,readPublishedApplicationList} from '../lib/cms/public-application-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_APPLICATION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const draft={...newApplication(),slug:'example',summary:'Summary',body:[{id:'body',kind:'paragraph',text:'Public body'}]};
const {internalNotes,relationships,claims,...payload}=draft;
const item={recordId:id(2),revisionId:id(3),type:'application',path:'/applications/example',locale:'en',payload,related:[]};
const card=(n,order=10)=>({recordId:id(n),revisionId:id(3),path:`/applications/item-${n}`,modifiedAt:'2026-10-29T10:00:00Z',title:order===0?'A first':'Example',summary:'Summary',image:null,kind:'application',seo:draft.seo});
test('application runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicApplicationConfig({}),null);for(const key of Object.keys(env))assert.equal(publicApplicationConfig({...env,[key]:''}),null);
 const requests=[];const config=publicApplicationConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedApplication('example',config),null);assert.match(String(requests[0].url),/get_public_application$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/applications/example',p_locale:'en'});
});
test('application detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedApplication('example',config)).content.summary,'Summary');
 assert.equal(await readPublishedApplication('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedApplication('example',null));
 for(const value of [{...item,path:'/applications/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedApplication('example',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedApplication('example',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('application listing validates bounded pagination and sorts display order without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,0);let calls=0;
 const rows=await readPublishedApplicationList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),kind:'industry'}]])await assert.rejects(()=>readPublishedApplicationList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedApplicationList({site,read:async()=>null,list:async()=>[]}),[]);
});

test('application pagination has a hard delivery cap and rejects oversized provider pages',async()=>{
 let calls=0;await assert.rejects(()=>readPublishedApplicationList({site,read:async()=>null,list:async()=>{const offset=calls++*100;return Array.from({length:100},(_,i)=>card(offset+i+2));}}),/delivery limit/);assert.equal(calls,100);
 await assert.rejects(()=>readPublishedApplicationList({site,read:async()=>null,list:async()=>Array.from({length:101},(_,i)=>card(i+2))}));
});

test('industry runtime binds both detail and list classification',async()=>{
 const industry={...item,path:'/industries/example',payload:{...payload,kind:'industry'}};
 assert.equal((await readPublishedApplication('example',{site,read:async()=>industry,list:async()=>[]},'industry')).content.kind,'industry');
 await assert.rejects(()=>readPublishedApplication('example',{site,read:async()=>industry,list:async()=>[]}));
 const row={...card(2),path:'/industries/item-2',kind:'industry'};
 assert.equal((await readPublishedApplicationList({site,read:async()=>null,list:async(after,kind)=>{assert.equal(kind,'industry');return [row];}},'industry')).length,1);
 await assert.rejects(()=>readPublishedApplicationList({site,read:async()=>null,list:async()=>[row]}));
});

test('configured application list calls the classified database reader with anonymous authority',async()=>{const requests=[];const config=publicApplicationConfig(env,async(url,init)=>{requests.push({url,init});return Response.json([]);});assert.deepEqual(await readPublishedApplicationList(config,'industry'),[]);assert.match(String(requests[0].url),/list_published_applications$/);assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_after:null,p_limit:100,p_kind:'industry'});assert.equal(requests[0].init.cache,'no-store');});
