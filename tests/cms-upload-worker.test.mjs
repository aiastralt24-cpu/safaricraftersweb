import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {processUpload} from '../lib/cms/upload-worker.ts';
async function fixture(){
 const bytes=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer();
 const job={id:'upload',site:'site',filename:'x.png',mime:'image/png',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),storageKey:'site/upload/original',deliveryKey:'site/upload/delivery.webp',leaseToken:'token'};
 const events=[];return {events,adapter:{claim:async()=>job,read:async()=>bytes,scan:async()=> 'clean',putVerified:async()=>events.push('stored'),finish:async()=>{events.push('finished');return 'asset';},fail:async(_j,code,retryable)=>events.push({code,retryable})}};
}
test('changed source bytes are rejected before scanning or storage',async()=>{
 const {adapter,events}=await fixture();adapter.read=async()=>Buffer.from('changed');const result=await processUpload(adapter,'site','upload');assert.equal(result.status,'rejected');assert.deepEqual(events,[{code:'bytes_mismatch',retryable:false}]);
});
test('storage failure cannot register media and lost final acknowledgement never reports ready',async()=>{
 const one=await fixture();one.adapter.putVerified=async()=>{throw Error('private provider token');};assert.equal((await processUpload(one.adapter,'site','upload')).status,'retry_pending');assert.deepEqual(one.events,[{code:'storage_unavailable',retryable:true}]);
 const two=await fixture();two.adapter.finish=async()=>{throw Error('connection lost');};assert.equal((await processUpload(two.adapter,'site','upload')).status,'unacknowledged');assert.deepEqual(two.events,['stored']);
});
test('scanner outages retry, identity mismatches never read objects, and empty claims do no work',async()=>{
 const one=await fixture();one.adapter.scan=async()=> 'unavailable';assert.equal((await processUpload(one.adapter,'site','upload')).status,'retry_pending');assert.deepEqual(one.events,[{code:'scan_unavailable',retryable:true}]);
 const two=await fixture();await assert.rejects(processUpload(two.adapter,'other','upload'),/identity mismatch/);assert.deepEqual(two.events,[]);
 two.adapter.claim=async()=>null;assert.equal((await processUpload(two.adapter,'site','upload')).status,'not_claimed');
});
