import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedDestinationList,destinationListReader} from '../lib/cms/published-destination-list.ts';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=n=>({recordId:id(n),revisionId:id(999),path:`/destinations/forest-${n}`,modifiedAt:'2026-10-22T00:00:00Z',slug:`forest-${n}`,title:`Forest ${n}`,description:'Forest guide',continent:'India',country:'India',region:'Central India',bestMonths:'Winter',image:{assetId:'forest',alt:'Forest',decorative:false},canonical:'',indexing:'inherit',sitemap:'inherit'});
test('destination catalogue follows exact cursors and validates summaries',async()=>{
 const cursors=[];const values=await readPublishedDestinationList(async after=>{cursors.push(after);return after===null?Array.from({length:100},(_,i)=>row(i+1)):[row(101)];});
 assert.deepEqual(cursors,[null,id(100)]);assert.equal(values.length,101);
 for(const batch of [[row(2),row(1)],[row(1),row(1)],[{...row(1),path:'/destinations/wrong'}],[{...row(1),image:null}],[{...row(1),internalNote:'private'}]])await assert.rejects(readPublishedDestinationList(async()=>batch));
 await assert.rejects(readPublishedDestinationList(async after=>after===null?Array.from({length:100},(_,i)=>row(i+1)):[row(100)]),/pagination/);
 assert.deepEqual(await readPublishedDestinationList(async()=>[]),[]);
});
test('destination catalogue uses anonymous credentials and fixed website and locale',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'must-not-use'};
 let call;const fetcher=async(url,options)=>{call={url,options};return Response.json([]);};
 await destinationListReader(env,fetcher,'fr')(id(2));
 assert.ok(String(call.url).endsWith('/rpc/list_published_destinations'));assert.equal(call.options.headers.Authorization,'Bearer public-key');
 assert.deepEqual(JSON.parse(call.options.body),{p_site:id(1),p_locale:'fr',p_after:id(2),p_limit:100});assert.equal(call.options.cache,'no-store');
 assert.throws(()=>destinationListReader({...env,CMS_PUBLIC_DELIVERY_ENABLED:'false'},fetcher));assert.throws(()=>destinationListReader(env,fetcher,'../../en'));
});
