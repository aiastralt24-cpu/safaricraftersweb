import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handlePublicMedia,publicMediaConfig} from '../lib/cms/public-media.ts';
const site='00000000-0000-4000-8000-000000000001',asset='inspected-image',bytes=new Uint8Array([82,73,70,70,1,2,3]);
const descriptor={site,id:asset,key:`${site}/${asset}/delivery.webp`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const request=()=>new Request(`https://site.test/api/cms/published/media/${asset}`);
const body=()=>new Response(bytes,{headers:{'Content-Type':'image/webp','Content-Length':String(bytes.length)}});
const config={site,authorize:async()=>descriptor,read:async()=>body()};
test('public media verifies exact bytes and rechecks publication before returning a private uncached response',async()=>{
 let reads=0;const result=await handlePublicMedia(request(),asset,{...config,authorize:async()=>{reads++;return descriptor;}});
 assert.equal(result.status,200);assert.equal(reads,2);assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('content-type'),'image/webp');
});
test('withdrawal and descriptor replacement during fetch cannot return an image',async()=>{
 for(const replacement of [null,{...descriptor,sha256:'f'.repeat(64)}]){let reads=0;const result=await handlePublicMedia(request(),asset,{...config,authorize:async()=>++reads===1?descriptor:replacement});assert.ok([404,503].includes(result.status));assert.equal(result.headers.get('content-type'),'application/json');}
});
test('public media rejects unbound storage paths, wrong types and mismatched bytes',async()=>{
 for(const value of [{...descriptor,key:'other/path'},{...descriptor,site:'00000000-0000-4000-8000-000000000002'},{...descriptor,id:'other'}])assert.equal((await handlePublicMedia(request(),asset,{...config,authorize:async()=>value})).status,503);
 for(const response of [new Response(bytes,{headers:{'Content-Type':'text/html'}}),new Response(bytes.slice(1),{headers:{'Content-Type':'image/webp'}}),new Response(new Uint8Array(bytes.length),{headers:{'Content-Type':'image/webp'}}),new Response(new Uint8Array(bytes.length+1),{headers:{'Content-Type':'image/webp'}})])assert.equal((await handlePublicMedia(request(),asset,{...config,read:async()=>response})).status,503);
 assert.equal((await handlePublicMedia(request(),asset,null)).status,503);assert.equal((await handlePublicMedia(request(),'../private',config)).status,400);assert.equal((await handlePublicMedia(new Request(request().url+'?site=other'),asset,config)).status,400);
});
test('public media runtime never uses the service role for metadata or storage',async()=>{
 const calls=[];const configured=publicMediaConfig({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'private-key'},async(url,options)=>{calls.push([String(url),options]);return String(url).includes('/rpc/')?Response.json(descriptor):body();});
 assert.equal((await handlePublicMedia(request(),asset,configured)).status,200);assert.equal(calls.length,3);assert.ok(calls.every(([,options])=>options.headers.Authorization==='Bearer public-key'&&options.redirect==='error'));assert.ok(!JSON.stringify(calls).includes('private-key'));assert.equal(publicMediaConfig({}),null);
});
