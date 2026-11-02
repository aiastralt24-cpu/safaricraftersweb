import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHeroVideoStorageAdapter} from '../lib/cms/hero-video-storage-adapter.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',leaseToken='00000000-0000-4000-8000-000000000003';
const config={url:'https://cms.test',serviceKey:'worker-secret'},scan=async()=>({status:'clean'}),bytes=Buffer.from([1,2,3]),hash=createHash('sha256').update(bytes).digest('hex'),key=`${site}/${id}/delivery.mp4`;
test('worker uses video RPCs and exact lease identity with private service credentials',async()=>{
 const calls=[];const adapter=createHeroVideoStorageAdapter(config,scan,async(url,options)=>{calls.push({url,options,args:JSON.parse(options.body)});return Response.json(null);});
 await adapter.claim(site,id);await adapter.finish({site,id,leaseToken},{sha256:hash});await adapter.fail({site,id,leaseToken},'storage_unavailable',true);
 assert.deepEqual(calls.map(c=>c.url.pathname),['/rest/v1/rpc/claim_hero_video_upload','/rest/v1/rpc/finish_hero_video_upload','/rest/v1/rpc/fail_upload']);
 assert.deepEqual(calls[1].args,{p_site:site,p_upload:id,p_token:leaseToken,p_result:{sha256:hash}});
 for(const {options}of calls){assert.equal(options.headers.Authorization,'Bearer worker-secret');assert.equal(options.headers['Content-Profile'],'cms');assert.equal(options.redirect,'error');}
});
test('new and duplicate derivative writes require identical readback; differing objects never overwrite',async()=>{
 for(const status of [200,409,400]){
  const calls=[];const adapter=createHeroVideoStorageAdapter(config,scan,async(url,options)=>{calls.push({url,options});return options.method==='POST'?Response.json(status===400?{code:'Duplicate'}:{},{status}):new Response(bytes);});
  await adapter.putVerified(key,bytes,hash,'video/mp4');assert.equal(calls.length,2);assert.equal(calls[0].options.headers['x-upsert'],'false');assert.equal(calls[1].url.pathname,`/storage/v1/object/cms-video-media/${key}`);
 }
 let writes=0;const adapter=createHeroVideoStorageAdapter(config,scan,async(_url,options)=>{if(options.method==='POST'){writes++;return Response.json({},{status:409});}return new Response(new Uint8Array([3,2,1]));});
 await assert.rejects(adapter.putVerified(key,bytes,hash,'video/mp4'),/checksum/);assert.equal(writes,1);
});
test('bounded original reads reject partial, oversized and misleading declared lengths',async()=>{
 for(const response of [new Response(new Uint8Array(2)),new Response(new Uint8Array(4)),new Response(bytes,{headers:{'content-length':'9'}}),new Response(null,{status:404})]){
  const adapter=createHeroVideoStorageAdapter(config,scan,async()=>response);await assert.rejects(adapter.read(`${site}/${id}/original`,3));
 }
 const adapter=createHeroVideoStorageAdapter(config,scan,async(url)=>{assert.equal(url.pathname,`/storage/v1/object/cms-video-originals/${site}/${id}/original`);return new Response(bytes);});
 assert.deepEqual(await adapter.read(`${site}/${id}/original`,3),bytes);
 await assert.rejects(adapter.read('../../escape',3));await assert.rejects(adapter.read(key,3));
});
test('invalid configuration, mismatched content and provider failures fail closed',async()=>{
 assert.throws(()=>createHeroVideoStorageAdapter({...config,url:'http://cms.test'},scan));
 const adapter=createHeroVideoStorageAdapter(config,scan,async()=>Response.json({message:'private diagnostics'},{status:500}));
 await assert.rejects(adapter.putVerified(key,bytes,'0'.repeat(64),'video/mp4'),/Invalid verified/);
 await assert.rejects(adapter.claim(site,id),error=>!error.message.includes('private diagnostics'));
 await assert.rejects(adapter.putVerified(key,bytes,hash,'video/mp4'),/not acknowledged/);
});
test('reception derives confirmation checksum from bounded stored bytes, never event metadata',async()=>{
 const calls=[];const adapter=createHeroVideoStorageAdapter(config,scan,async(url,options)=>{
  calls.push({url,options});
  if(url.pathname.endsWith('/get_hero_video_reception'))return Response.json({site,id,key:`${site}/${id}/original`,mime:'video/mp4',bytes:3});
  if(url.pathname.endsWith('/confirm_upload'))return new Response(null,{status:204});
  return new Response(bytes);
 });
 assert.equal(await adapter.confirmOriginal(site,id),'confirmed');assert.equal(calls.length,3);
 assert.deepEqual(JSON.parse(calls[2].options.body),{p_site:site,p_upload:id,p_sha256:hash,p_bytes:3});
 for(const value of [null,{site,id,key:'foreign',mime:'video/mp4',bytes:3}]){
  let count=0;const rejected=createHeroVideoStorageAdapter(config,scan,async()=>{count++;return Response.json(value);});
  if(value===null)assert.equal(await rejected.confirmOriginal(site,id),'not_reserved');else await assert.rejects(rejected.confirmOriginal(site,id));
  assert.equal(count,1);
 }
});
