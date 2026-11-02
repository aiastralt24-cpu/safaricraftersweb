import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDestinationConfig,readPublishedDestination,handlePublishedDestination} from '../lib/cms/public-destination-runtime.ts';
const site='00000000-0000-4000-8000-000000000001';
test('public destination transport uses only anon credentials and fixed publication RPC',async()=>{
 let captured;const config=publicDestinationConfig({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'must-not-use'},async(url,options)=>{captured={url:String(url),options};return Response.json(null);});
 assert.equal(await readPublishedDestination('forest',config),null);assert.equal(captured.url,'https://database.test/rest/v1/rpc/get_public_destination');assert.equal(captured.options.headers.Authorization,'Bearer public-key');assert.equal(captured.options.headers.apikey,'public-key');assert.equal(captured.options.redirect,'error');assert.deepEqual(JSON.parse(captured.options.body),{p_site:site,p_path:'/destinations/forest',p_locale:'en'});
 assert.equal(publicDestinationConfig({}),null);
});
test('destination endpoint separates absence from unavailable/malformed delivery and rejects overrides',async()=>{
 const req=query=>new Request(`https://site.test/api/cms/published/destinations/forest${query}`);
 const config={site,read:async()=>null};assert.equal((await handlePublishedDestination(req(''),'forest',config)).status,404);
 assert.equal((await handlePublishedDestination(req(''),'forest',null)).status,503);
 for(const query of ['?site='+site,'?locale=en&locale=fr','?locale=bad_language'])assert.equal((await handlePublishedDestination(req(query),'forest',config)).status,400);
 for(const read of [async()=>({payload:{draft:true}}),async()=>{throw Error('private upstream information');}]){const response=await handlePublishedDestination(req(''),'forest',{site,read});assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);assert.ok(!(await response.text()).includes('private upstream'));}
});
