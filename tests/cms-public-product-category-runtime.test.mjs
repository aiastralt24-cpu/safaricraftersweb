import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';
import {publicProductCategoryConfig,readPublishedProductCategory,readPublishedProductCategoryList} from '../lib/cms/public-product-category-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'public-fixture'};
const draft={...newProductCategory(),slug:'example',summary:'Summary'};
const {internalNotes,attributeGroups,parent,...payload}=draft;
const item={recordId:id(2),revisionId:id(3),type:'productCategory',path:'/product-categories/example',locale:'en',payload,parent:null};
const card=(n,order=10)=>({recordId:id(n),revisionId:id(3),path:`/product-categories/item-${n}`,modifiedAt:'2026-10-31T10:00:00Z',title:order===0?'A first':'Example',summary:'Summary',parent:null,seo:draft.seo});
test('product-category runtime requires explicit rollout and anonymous provider configuration',async()=>{
 assert.equal(publicProductCategoryConfig({}),null);for(const key of Object.keys(env))assert.equal(publicProductCategoryConfig({...env,[key]:''}),null);
 const requests=[];const config=publicProductCategoryConfig({...env,CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'},async(url,init)=>{requests.push({url,init});return Response.json(null);});
 assert.equal(await readPublishedProductCategory('example',config),null);assert.match(String(requests[0].url),/get_public_product_category$/);assert.equal(requests[0].init.cache,'no-store');assert.ok(!JSON.stringify(requests).includes('never-send'));assert.deepEqual(JSON.parse(requests[0].init.body),{p_site:site,p_path:'/product-categories/example',p_locale:'en'});
});
test('product-category detail rejects invalid identity and private data and propagates provider failures',async()=>{
 const config={site,read:async()=>item,list:async()=>[]};assert.equal((await readPublishedProductCategory('example',config)).content.summary,'Summary');
 assert.equal(await readPublishedProductCategory('../secret',{...config,read:()=>assert.fail()}),null);
 await assert.rejects(()=>readPublishedProductCategory('example',null));
 for(const value of [{...item,path:'/product-categories/wrong'},{...item,payload:{...payload,internalNotes:'Private'}},{...item,locale:'fr'}])await assert.rejects(()=>readPublishedProductCategory('example',{...config,read:async()=>value}));
 await assert.rejects(()=>readPublishedProductCategory('example',{...config,read:async()=>{throw Error('Provider unavailable');}}),/Provider unavailable/);
});
test('product-category listing validates bounded pagination and sorts display order without exposing drafts',async()=>{
 const first=Array.from({length:100},(_,i)=>card(i+2)),last=card(102,0);let calls=0;
 const rows=await readPublishedProductCategoryList({site,read:async()=>null,list:async after=>{calls++;assert.equal(after,calls===1?null:first.at(-1).recordId);return calls===1?first:[last];}});assert.equal(rows.length,101);assert.equal(rows[0].recordId,last.recordId);
 for(const batch of [[card(3),card(2)],[card(2),card(2)],[card(2),{...card(3),path:card(2).path}],[{...card(2),internalNotes:'Private'}],[{...card(2),kind:'industry'}]])await assert.rejects(()=>readPublishedProductCategoryList({site,read:async()=>null,list:async()=>batch}));
 assert.deepEqual(await readPublishedProductCategoryList({site,read:async()=>null,list:async()=>[]}),[]);
});

test('product-category pagination has a hard delivery cap and rejects oversized provider pages',async()=>{
 let calls=0;await assert.rejects(()=>readPublishedProductCategoryList({site,read:async()=>null,list:async()=>{const offset=calls++*100;return Array.from({length:100},(_,i)=>card(offset+i+2));}}),/delivery limit/);assert.equal(calls,100);
 await assert.rejects(()=>readPublishedProductCategoryList({site,read:async()=>null,list:async()=>Array.from({length:101},(_,i)=>card(i+2))}));
});

