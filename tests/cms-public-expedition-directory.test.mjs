import test from 'node:test';
import assert from 'node:assert/strict';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {readPublishedExpeditionDirectory,expeditionDirectoryReader} from '../lib/cms/public-expedition-directory.ts';
const site='00000000-0000-4000-8000-000000000001',a='10000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000001',hash='a'.repeat(32);
function card(id,slug){const base=newPhotoExpedition();return {websiteId:site,recordId:id,revisionId:site,locale:'en',path:`/photo-expeditions/${slug}`,content:{slug,title:slug,geography:base.geography,programmeStatus:base.programmeStatus,category:'Photo',duration:'Five days',description:'Forest',price:'Exact price',dateLabel:'Dates on request',image:{assetId:'forest',alt:'Forest',decorative:false},departures:[],seo:base.seo}};}
const page=(items,nextCursor=null,snapshot=hash)=>({websiteId:site,locale:'en',snapshot,items,nextCursor});
test('expedition directory carries snapshot and cursor across pages without exposing partial results',async()=>{const calls=[];const result=await readPublishedExpeditionDirectory(site,async(s,after,snapshot)=>{calls.push([s,after,snapshot]);return after?page([card(b,'second')]):page([card(a,'first')],a);});assert.deepEqual(result.map(item=>item.recordId),[a,b]);assert.deepEqual(calls,[[site,null,null],[site,a,hash]]);assert.deepEqual(await readPublishedExpeditionDirectory(site,async()=>page([])),[]);});
test('expedition directory rejects snapshot drift, duplicate records, foreign identity and malformed cursor',async()=>{
 for(const second of [page([card(b,'second')],null,'b'.repeat(32)),page([card(a,'first')]),page([] ,b),page([{...card(b,'second'),websiteId:a}]),page([{...card(b,'second'),path:'/photo-expeditions/wrong'}]),page([{...card(b,'second'),content:{...card(b,'second').content,image:undefined}}])])await assert.rejects(readPublishedExpeditionDirectory(site,async(_site,after)=>after?second:page([card(a,'first')],a)));
 await assert.rejects(readPublishedExpeditionDirectory(site,async()=>page([card(a,'first')],b)));
});
test('expedition directory transport requires rollout and confines request identity',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'public-key'};let called=0;
 const reader=expeditionDirectoryReader(env,async(url,options)=>{called++;assert.equal(String(url),'https://cms.test/rest/v1/rpc/list_public_expeditions');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en',p_after:a,p_snapshot:hash,p_limit:50});return Response.json(page([]));});await reader(site,a,hash);assert.equal(called,1);
 assert.throws(()=>reader(a,null,null));assert.throws(()=>reader(site,'bad',hash));for(const key of Object.keys(env))assert.throws(()=>expeditionDirectoryReader({...env,[key]:undefined}));
});
