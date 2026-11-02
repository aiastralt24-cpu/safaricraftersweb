import test from 'node:test';import assert from 'node:assert/strict';
import {productEnvelope} from './fixtures/product-public.mjs';
import {publicProductConfig,readPublishedProduct,readPublishedProductList} from '../lib/cms/public-product-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true',CMS_PRODUCT_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const item=productEnvelope(),draft=item.payload,payload=item.payload;
const card=(n,order=10)=>({recordId:id(n),revisionId:id(3),path:`/products/item-${n}`,modifiedAt:'2026-10-31T10:00:00Z',title:order===0?'A first':'Example',summary:'Summary',code:'001',brand:'',image:null,lifecycle:'active',seo:draft.seo});
test('product runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicProductConfig({}),null);for(const key of Object.keys(env))assert.equal(publicProductConfig({...env,[key]:''}),null);
 const requests=[];const config=publicProductConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedProduct('synthetic',config),null);assert.match(String(requests[0].url),/get_public_product$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/products/synthetic',p_locale:'en'});
});
test('product detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedProduct('synthetic',config)).content.summary,'Product summary');
 assert.equal(await readPublishedProduct('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedProduct('synthetic',null));
 for(const value of [{...item,path:'/products/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedProduct('synthetic',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedProduct('synthetic',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('product listing validates bounded pagination and sorts display order without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,0);let calls=0;
 const rows=await readPublishedProductList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),kind:'industry'}]])await assert.rejects(()=>readPublishedProductList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedProductList({site,read:async()=>null,list:async()=>[]}),[]);
});

test('product pagination has a hard delivery cap and rejects oversized provider pages',async()=>{
 let calls=0;await assert.rejects(()=>readPublishedProductList({site,read:async()=>null,list:async()=>{const offset=calls++*100;return Array.from({length:100},(_,i)=>card(offset+i+2));}}),/delivery limit/);assert.equal(calls,100);
 await assert.rejects(()=>readPublishedProductList({site,read:async()=>null,list:async()=>Array.from({length:101},(_,i)=>card(i+2))}));
});

test('product listing passes exact category filters through the anonymous gateway and rejects invalid filter IDs',async()=>{
 const requests=[],config=publicProductConfig(env,async(url,init)=>{requests.push({url,init});return Response.json([]);});assert.deepEqual(await readPublishedProductList(config,id(9)),[]);assert.match(String(requests[0].url),/list_published_products$/);assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_after:null,p_limit:100,p_category:id(9)});await assert.rejects(()=>readPublishedProductList(config,'invalid'));assert.equal(requests.length,1);
});
