import test from 'node:test';import assert from 'node:assert/strict';import {homepagePublishedReaders} from '../lib/cms/homepage-published-readers.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'public',CMS_SUPABASE_SERVICE_ROLE_KEY:'PRIVATE'};
const guest={recordId:id,revisionId:site,name:'Anonymous guest',quote:'A wonderful trip.',trip:'Forest',category:'Guest'};
test('homepage readers use scoped public RPCs and never service credentials or draft endpoints',async()=>{
 const calls=[];const read=homepagePublishedReaders(env,async(url,options)=>{calls.push({url:String(url),options,args:JSON.parse(options.body)});return Response.json(String(url).endsWith('get_public_homepage_guest')?guest:String(url).endsWith('list_public_expeditions')?{websiteId:site,locale:'en',snapshot:'a'.repeat(32),items:[],nextCursor:null}:[]);});
 assert.deepEqual(await read.journeys(site,'en'),{site,items:[]});assert.deepEqual(await read.expeditions(site,'en'),{site,items:[]});assert.deepEqual(await read.guest(site,id,'en'),{site,record:guest});assert.equal(calls.length,3);assert.ok(calls.every(c=>c.args.p_site===site&&c.options.headers.Authorization==='Bearer public'&&c.options.redirect==='error'));assert.equal(JSON.stringify(calls).includes('PRIVATE'),false);
});
test('scope mismatch, missing public guest and unavailable expedition rollout fail without fallback',async()=>{
 let calls=0;const read=homepagePublishedReaders(env,async()=>{calls++;return Response.json(null);});await assert.rejects(read.journeys(id,'en'));await assert.rejects(read.expeditions(site,'fr'));await assert.rejects(read.guest(site,'bad','en'));assert.equal(calls,0);await assert.rejects(read.guest(site,id,'en'));assert.equal(calls,1);
 await assert.rejects(homepagePublishedReaders({...env,CMS_EXPEDITION_DELIVERY_ENABLED:'false'},async()=>assert.fail()).expeditions(site,'en'));assert.throws(()=>homepagePublishedReaders({}));
});
