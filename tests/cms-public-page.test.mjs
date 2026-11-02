import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublishedPage,handlePublicPageRead} from '../lib/cms/public-page.ts';
import {publicPageConfig} from '../lib/cms/public-page-runtime.ts';
const id='00000000-0000-4000-8000-000000000001';
const page={recordId:id,revisionId:id,type:'journey',payload:{slug:'forest',title:'Forest journey',description:'A journey through the forest.',intro:'Explore with an expert guide.',region:'India',duration:'5 days',bestMonths:'November'}};
test('published projection rejects malformed content, unknown metadata and unsupported types',()=>{
 assert.deepEqual(projectPublishedPage(page,'/journeys/forest'),page);
 for(const input of [{...page,payload:{...page.payload,internalNotes:'Private'}},{...page,type:'testimonial'},{...page,payload:{...page.payload,slug:'changed'}},{...page,payload:{...page.payload,itinerary:[{title:'Incomplete'}]}},{...page,type:'page',payload:{composition:{schemaVersion:1,title:'Empty',sections:[]},internalNotes:'Private'}}])assert.equal(projectPublishedPage(input,'/journeys/forest'),null);
});
test('public read pins website and locale, rejects query overrides and never caches missing content',async()=>{
 let args;const config={site:id,read:async(...values)=>{args=values;return page;}};
 const get=path=>new Request(`https://site.test/api/cms/published${path}`);
 const response=await handlePublicPageRead(get('?path=/journeys/forest&locale=en'),config);assert.equal(response.status,200);assert.deepEqual(args,[id,'/journeys/forest','en']);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const query of ['?path=/journeys/forest&site=other','?path=/journeys/forest&path=/private','?path=//external','?path=/../private'])assert.equal((await handlePublicPageRead(get(query),config)).status,400);
 assert.equal((await handlePublicPageRead(get('?path=/missing'),{...config,read:async()=>null})).status,404);
 assert.equal((await handlePublicPageRead(get('?path=/missing'),null)).status,503);
 assert.equal((await handlePublicPageRead(get('?path=/journeys/forest'),{...config,read:async()=>({private:'unexpected'})})).status,503);
});
test('runtime uses only configured public credentials and fixed published RPC',async()=>{
 assert.equal(publicPageConfig({}),null);let seen;
 const config=publicPageConfig({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'must-not-use'},async(url,options)=>{seen=[String(url),options];return Response.json(page);});
 await config.read(id,'/journeys/forest','en');assert.equal(seen[0],'https://database.test/rest/v1/rpc/get_public_page');assert.equal(seen[1].headers.Authorization,'Bearer public-key');assert.equal(seen[1].redirect,'error');assert.ok(!JSON.stringify(seen).includes('must-not-use'));
});
