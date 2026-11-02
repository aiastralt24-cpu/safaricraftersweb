import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createEnquiryFileStorageAdapter} from '../lib/cms/enquiry-file-storage-adapter.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const site=id(1),upload=id(2),request=id(3),leaseToken=id(4),scope={site,form:id(5),revision:id(6),request,field:'cv'};
const config={url:'https://cms.test',serviceKey:'worker-secret',site},scan=async()=>'clean',bytes=Buffer.from([1,2,3]),hash=createHash('sha256').update(bytes).digest('hex'),base=`${site}/enquiries/${request}/${upload}`;
test('attachment adapter uses scoped private RPCs, exact leases and verified completion identity',async()=>{
 const calls=[];const adapter=createEnquiryFileStorageAdapter(config,scan,async(url,options)=>{calls.push({url,options,args:JSON.parse(options.body)});return Response.json(url.pathname.endsWith('finish_enquiry_file')?upload:null);});
 await adapter.claim(scope,upload);await adapter.finish({site,id:upload,leaseToken},{sha256:hash});await adapter.fail({site,id:upload,leaseToken},'storage_unavailable',true);
 assert.deepEqual(calls.map(v=>v.url.pathname),['/rest/v1/rpc/claim_enquiry_file','/rest/v1/rpc/finish_enquiry_file','/rest/v1/rpc/fail_enquiry_file']);
 assert.deepEqual(calls[1].args,{p_site:site,p_upload:upload,p_token:leaseToken,p_result:{sha256:hash}});
 for(const {options} of calls){assert.equal(options.headers.Authorization,'Bearer worker-secret');assert.equal(options.headers['Content-Profile'],'cms');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');}
 assert.throws(()=>adapter.claim({...scope,site:id(9)},upload));await assert.rejects(()=>adapter.finish({site:id(9),id:upload,leaseToken},{}));assert.equal(calls.length,3);
 const wrong=createEnquiryFileStorageAdapter(config,scan,async()=>Response.json(id(9)));await assert.rejects(()=>wrong.finish({site,id:upload,leaseToken},{}),/identity/);
});
test('private derivative writes never overwrite and verify both new and duplicate objects',async()=>{
 for(const [suffix,mime] of [['pdf','application/pdf'],['webp','image/webp']])for(const status of [200,409,400]){
  const calls=[];const adapter=createEnquiryFileStorageAdapter(config,scan,async(url,options)=>{calls.push({url,options});return options.method==='POST'?Response.json(status===400?{code:'Duplicate'}:{},{status}):new Response(bytes);});
  await adapter.putVerified(`${base}/delivery.${suffix}`,bytes,hash,mime);assert.equal(calls.length,2);assert.equal(calls[0].options.headers['x-upsert'],'false');assert.equal(calls[1].url.pathname,`/storage/v1/object/cms-enquiry-files/${base}/delivery.${suffix}`);
 }
 let writes=0;const mismatch=createEnquiryFileStorageAdapter(config,scan,async(_url,options)=>{if(options.method==='POST'){writes++;return Response.json({},{status:409});}return new Response(new Uint8Array([3,2,1]));});
 await assert.rejects(()=>mismatch.putVerified(`${base}/delivery.pdf`,bytes,hash,'application/pdf'),/checksum/);assert.equal(writes,1);
});
test('private reads reject truncation, oversize, misleading lengths and foreign or unsafe paths',async()=>{
 for(const response of [new Response(new Uint8Array(2)),new Response(new Uint8Array(4)),new Response(bytes,{headers:{'content-length':'9'}}),new Response(null,{status:404})])await assert.rejects(()=>createEnquiryFileStorageAdapter(config,scan,async()=>response).read(`${base}/original`,3));
 let calls=0;const adapter=createEnquiryFileStorageAdapter(config,scan,async()=>{calls++;return new Response(bytes);});assert.deepEqual(await adapter.read(`${base}/original`,3),bytes);
 for(const key of ['../../escape',`${base}/delivery.pdf`,`${base}/original?x=1`,`${base}/original/extra`,`${id(9)}/enquiries/${request}/${upload}/original`,`${site}/enquiries/not-uuid/${upload}/original`])await assert.rejects(()=>adapter.read(key,3));assert.equal(calls,1);
});
test('bad configuration, content and provider responses expose no private diagnostics',async()=>{
 for(const patch of [{url:'http://cms.test'},{url:'https://cms.test/other'},{serviceKey:'bad\nkey'},{site:'bad'}])assert.throws(()=>createEnquiryFileStorageAdapter({...config,...patch},scan));
 let calls=0;const adapter=createEnquiryFileStorageAdapter(config,scan,async()=>{calls++;return Response.json({message:'private diagnostics'},{status:500});});
 await assert.rejects(()=>adapter.putVerified(`${base}/delivery.pdf`,bytes,'0'.repeat(64),'application/pdf'));
 await assert.rejects(()=>adapter.putVerified(`${base}/delivery.webp`,bytes,hash,'application/pdf'));assert.equal(calls,0);
 await assert.rejects(()=>adapter.claim(scope,upload),error=>!error.message.includes('private diagnostics'));
 await assert.rejects(()=>adapter.putVerified(`${base}/delivery.pdf`,bytes,hash,'application/pdf'),/not acknowledged/);
});
