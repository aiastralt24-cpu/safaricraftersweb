import test from 'node:test';import assert from 'node:assert/strict';import {processEnquiryFileCleanup} from '../lib/cms/enquiry-file-cleanup-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),upload=id(2),request=id(3),base=`${site}/enquiries/${request}/${upload}`,job={site,upload,request,leaseToken:id(4),policyVersion:1,category:'submitted',keys:[`${base}/original`,`${base}/delivery.pdf`]};
test('cleanup checks both objects absent before completing and safely retries partial deletion',async()=>{
 const objects=new Set(job.keys),calls=[];let failed=false;
 const adapter={claim:async()=>job,remove:async key=>{calls.push(key);if(key===job.keys[1]&&!failed){failed=true;throw Error('storage unavailable');}objects.delete(key);},missing:async key=>!objects.has(key),finish:async()=>{assert.equal(objects.size,0);return upload;},fail:async()=>{}};
 assert.deepEqual(await processEnquiryFileCleanup(adapter,site,upload),{status:'retry',upload});assert.equal(objects.size,1);assert.deepEqual(await processEnquiryFileCleanup(adapter,site,upload),{status:'deleted',upload});assert.equal(calls.length,4);
});
test('wrong scope and unconfirmed absence never finish cleanup',async()=>{
 let finishes=0,failures=0;const adapter={claim:async()=>job,remove:async()=>{},missing:async()=>false,finish:async()=>{finishes++;return upload;},fail:async()=>{failures++;}};
 assert.equal((await processEnquiryFileCleanup(adapter,site,upload)).status,'retry');assert.equal(finishes,0);assert.equal(failures,1);
 for(const patch of [{site:id(9)},{upload:id(9)},{keys:[`${base}/original`,'another/object']}])await assert.rejects(()=>processEnquiryFileCleanup({...adapter,claim:async()=>({...job,...patch}),remove:async()=>assert.fail('must not delete')},site,upload));
});
test('uncertain completion never competes with a committed result and idle claims perform no storage work',async()=>{
 const adapter={claim:async()=>job,remove:async()=>{},missing:async()=>true,finish:async()=>{throw Error('lost reply');},fail:async()=>assert.fail('must not overwrite completion')};
 assert.deepEqual(await processEnquiryFileCleanup(adapter,site,upload),{status:'unacknowledged',upload});assert.deepEqual(await processEnquiryFileCleanup({...adapter,claim:async()=>null,remove:async()=>assert.fail('idle')},site,upload),{status:'idle'});
});
