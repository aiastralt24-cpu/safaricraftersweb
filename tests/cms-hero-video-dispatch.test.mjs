import test from 'node:test';import assert from 'node:assert/strict';
import {dispatchHeroVideos} from '../lib/cms/hero-video-dispatch.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
test('dispatcher validates the complete batch before side effects',async()=>{
 for(const batch of [[{site,id},{site,id}],[{site,id:'bad'}],[{site,id},{site,id:other}]]){
  await assert.rejects(dispatchHeroVideos({listWork:async()=>batch,confirmOriginal:async()=>assert.fail()}, {},1));
 }
 await assert.rejects(dispatchHeroVideos({listWork:async()=>assert.fail()}, {},0));
});
test('lost reception acknowledgement is retried from durable discovery without claiming or failing',async()=>{
 let received=false,claims=0,confirmations=0;
 const adapter={listWork:async()=>[{site,id}],confirmOriginal:async()=>{confirmations++;if(!received){received=true;throw Error('response lost after commit');}return 'not_reserved';},claim:async()=>{claims++;return null;},fail:async()=>assert.fail()};
 assert.equal((await dispatchHeroVideos(adapter,{}))[0].status,'unacknowledged');assert.equal(claims,0);
 assert.equal((await dispatchHeroVideos(adapter,{}))[0].status,'not_claimed');assert.equal(claims,1);assert.equal(confirmations,2);
});
test('one failed job does not prevent later work and all reception/claim operations remain sequential',async()=>{
 const calls=[];const adapter={listWork:async()=>[{site,id},{site,id:other}],confirmOriginal:async(_site,upload)=>{calls.push(`receive:${upload}`);return 'confirmed';},claim:async(_site,upload)=>{calls.push(`claim:${upload}`);if(upload===id)throw Error('provider outage');return null;},fail:async()=>assert.fail()};
 const result=await dispatchHeroVideos(adapter,{});assert.deepEqual(result.map(r=>r.status),['unacknowledged','not_claimed']);assert.deepEqual(calls,[`receive:${id}`,`claim:${id}`,`receive:${other}`,`claim:${other}`]);
});
