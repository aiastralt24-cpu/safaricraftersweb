import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleMediaPreview,readPrivateMedia} from '../lib/cms/media-preview.ts';
const site='00000000-0000-4000-8000-000000000001',asset='image',bytes=new Uint8Array([1,2,3]);
const file={site,id:asset,key:`${site}/${asset}/delivery.webp`,bytes:3,sha256:createHash('sha256').update(bytes).digest('hex')};
const request=()=>new Request(`https://site.test/api/cms/media/preview?site=${site}&asset=${asset}`,{headers:{Authorization:'Bearer a.b.c'}});
const image=(body=bytes)=>new Response(body,{headers:{'Content-Type':'image/webp'}});
test('verified private bytes are returned with noncacheable headers and no public URL',async()=>{
 const response=await handleMediaPreview(request(),{authorize:async(token)=>{assert.equal(token,'a.b.c');return file;},read:async(token)=>{assert.equal(token,'a.b.c');return image();}});
 assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
});
test('hidden images and mismatched destinations never access storage',async()=>{
 for(const [value,status]of [[null,404],[{...file,key:'another/site'},503]])assert.equal((await handleMediaPreview(request(),{authorize:async()=>value,read:async()=>assert.fail()})).status,status);
});
test('wrong MIME, oversized, truncated and modified bytes fail closed',async()=>{
 for(const response of [new Response(bytes,{headers:{'Content-Type':'text/html'}}),image(new Uint8Array(4)),image(new Uint8Array(2)),image(new Uint8Array([3,2,1]))])assert.equal((await handleMediaPreview(request(),{authorize:async()=>file,read:async()=>response})).status,503);
});
test('storage preview keeps user authorization and forbids redirects',async()=>{
 let input;await readPrivateMedia({url:'https://cms.test',key:'public'},'user-token',file,async(...args)=>{input=args;return image();});assert.equal(input[0].pathname,`/storage/v1/object/authenticated/cms-media/${file.key}`);assert.equal(input[1].headers.Authorization,'Bearer user-token');assert.equal(input[1].redirect,'error');
});
