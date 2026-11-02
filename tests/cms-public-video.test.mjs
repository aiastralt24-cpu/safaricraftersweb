import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handlePublicVideo,publicVideoConfig} from '../lib/cms/public-video.ts';
const site='00000000-0000-4000-8000-000000000001',asset='inspected-image',bytes=new Uint8Array([82,73,70,70,1,2,3]);
const descriptor={site,id:asset,key:`${site}/${asset}/delivery.mp4`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const request=()=>new Request(`https://site.test/api/cms/published/media/${asset}`);
const body=()=>new Response(bytes,{headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length)}});
const config={site,authorize:async()=>descriptor,read:async()=>body()};
test('public video verifies exact bytes and rechecks publication before returning a private uncached response',async()=>{
 let reads=0;const result=await handlePublicVideo(request(),asset,{...config,authorize:async()=>{reads++;return descriptor;}});
 assert.equal(result.status,200);assert.equal(reads,2);assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('content-type'),'video/mp4');
});
test('withdrawal and descriptor replacement during fetch cannot return a video',async()=>{
 for(const replacement of [null,{...descriptor,sha256:'f'.repeat(64)}]){let reads=0;const result=await handlePublicVideo(request(),asset,{...config,authorize:async()=>++reads===1?descriptor:replacement});assert.ok([404,503].includes(result.status));assert.equal(result.headers.get('content-type'),'application/json');}
});
test('public video rejects unbound storage paths, wrong types and mismatched bytes',async()=>{
 for(const value of [{...descriptor,key:'other/path'},{...descriptor,site:'00000000-0000-4000-8000-000000000002'},{...descriptor,id:'other'}])assert.equal((await handlePublicVideo(request(),asset,{...config,authorize:async()=>value})).status,503);
 for(const response of [new Response(bytes,{headers:{'Content-Type':'text/html'}}),new Response(bytes.slice(1),{headers:{'Content-Type':'video/mp4'}}),new Response(new Uint8Array(bytes.length),{headers:{'Content-Type':'video/mp4'}}),new Response(new Uint8Array(bytes.length+1),{headers:{'Content-Type':'video/mp4'}})])assert.equal((await handlePublicVideo(request(),asset,{...config,read:async()=>response})).status,503);
 assert.equal((await handlePublicVideo(request(),asset,null)).status,503);assert.equal((await handlePublicVideo(request(),'../private',config)).status,400);assert.equal((await handlePublicVideo(new Request(request().url+'?site=other'),asset,config)).status,400);
});
test('public video runtime never uses the service role for metadata or storage',async()=>{
 const calls=[];const configured=publicVideoConfig({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_PUBLIC_HERO_VIDEO_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'private-key'},async(url,options)=>{calls.push([String(url),options]);return String(url).includes('/rpc/')?Response.json(descriptor):body();});
 assert.equal((await handlePublicVideo(request(),asset,configured)).status,200);assert.equal(calls.length,3);assert.ok(calls.every(([,options])=>options.headers.Authorization==='Bearer public-key'&&options.redirect==='error'));assert.ok(!JSON.stringify(calls).includes('private-key'));assert.equal(publicVideoConfig({}),null);
});
test('video ranges return exact verified subsets and fail unsatisfiable requests before storage',async()=>{
 for(const [range,start,end] of [['bytes=0-1',0,1],['bytes=2-',2,6],['bytes=-2',5,6],['bytes=3-999',3,6],['bytes=-999',0,6]]){
  const result=await handlePublicVideo(new Request(request().url,{headers:{Range:range}}),asset,config);assert.equal(result.status,206);assert.equal(result.headers.get('content-range'),`bytes ${start}-${end}/7`);assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes.slice(start,end+1));
 }
 for(const range of ['bytes=7-','bytes=4-2','bytes=-0','bytes=0-1,3-4','bytes=-','bytes=999999999999999999999-','items=0-1']){
  const result=await handlePublicVideo(new Request(request().url,{headers:{Range:range}}),asset,{...config,read:async()=>assert.fail('invalid range must not fetch')});assert.equal(result.status,416);assert.equal(result.headers.get('content-range'),'bytes */7');
 }
 const full=await handlePublicVideo(new Request(request().url,{headers:{Range:'bytes=0-1','If-Range':'stale'}}),asset,config);assert.equal(full.status,200);assert.deepEqual(new Uint8Array(await full.arrayBuffer()),bytes);
});
test('range responses cannot bypass full-file integrity or the final publication check',async()=>{
 const ranged=new Request(request().url,{headers:{Range:'bytes=0-1'}});
 assert.equal((await handlePublicVideo(ranged,asset,{...config,read:async()=>new Response(new Uint8Array([82,73,0,0,0,0,0]),{headers:{'Content-Type':'video/mp4'}})})).status,503);
 let checks=0;assert.equal((await handlePublicVideo(ranged,asset,{...config,authorize:async()=>++checks===1?descriptor:null})).status,404);
 assert.equal(publicVideoConfig({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'public'}),null);
});
