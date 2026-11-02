import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';
import {publicNewsConfig,readPublishedNews,readPublishedNewsList} from '../lib/cms/public-news-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_NEWS_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const draft={...newNews(),slug:'example',summary:'Summary',author:'Author',date:'2026-10-29',topic:'Announcements',body:[{id:'body',kind:'paragraph',text:'Public body'}]};
const {internalNotes,relationships,...payload}=draft;
const item={recordId:id(2),revisionId:id(3),type:'news',path:'/news/example',locale:'en',payload,related:[]};
const card=(n,date='2026-10-29')=>({recordId:id(n),revisionId:id(3),path:`/news/item-${n}`,modifiedAt:'2026-10-29T10:00:00Z',title:'Example',summary:'Summary',image:null,topic:'Announcements',date,kind:'news',seo:draft.seo});
test('news runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicNewsConfig({}),null);for(const key of Object.keys(env))assert.equal(publicNewsConfig({...env,[key]:''}),null);
 const requests=[];const config=publicNewsConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedNews('example',config),null);assert.match(String(requests[0].url),/get_public_news$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/news/example',p_locale:'en'});
});
test('news detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedNews('example',config)).content.summary,'Summary');
 assert.equal(await readPublishedNews('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedNews('example',null));
 for(const value of [{...item,path:'/news/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedNews('example',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedNews('example',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('news listing validates bounded pagination and sorts editorial dates without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,'2026-10-30');let calls=0;
 const rows=await readPublishedNewsList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),date:'not-date'}]])await assert.rejects(()=>readPublishedNewsList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedNewsList({site,read:async()=>null,list:async()=>[]}),[]);
});
