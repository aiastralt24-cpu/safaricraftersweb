import test from 'node:test';import assert from 'node:assert/strict';
import {createEnquiryFileCleanupStorage} from '../lib/cms/enquiry-file-cleanup-storage.ts';
import {dispatchEnquiryFileCleanup,enquiryFileCleanupConfig,handleEnquiryFileCleanup} from '../lib/cms/enquiry-file-cleanup-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),upload=id(2),request=id(3),base=`${site}/enquiries/${request}/${upload}`,job={site,upload,request,leaseToken:id(4),policyVersion:1,category:'submitted',keys:[`${base}/original`,`${base}/delivery.pdf`]},config={site,url:'https://database.test',serviceKey:'synthetic-service-key'};
function provider(patch={}){const objects=new Set(job.keys),calls=[];let finished=0,failed=0;return {objects,calls,get finished(){return finished;},get failed(){return failed;},fetcher:async(url,options)=>{const path=url.pathname;calls.push({path,options});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,`Bearer ${config.serviceKey}`);
 if(path.endsWith('/list_enquiry_file_cleanup'))return Response.json([{site,upload}]);
 if(path.endsWith('/claim_enquiry_file_cleanup'))return Response.json(job);
 if(path.endsWith('/finish_enquiry_file_cleanup')){finished++;assert.equal(objects.size,0);return Response.json(upload);}
 if(path.endsWith('/fail_enquiry_file_cleanup')){failed++;return Response.json(null);}
 if(options.method==='DELETE'){assert.equal(path,'/storage/v1/object/cms-enquiry-files');const body=JSON.parse(options.body);assert.equal(body.prefixes.length,1);assert.ok(job.keys.includes(body.prefixes[0]));objects.delete(body.prefixes[0]);return Response.json([]);}
 assert.ok(path.startsWith('/storage/v1/object/info/cms-enquiry-files/'));if(patch.absence)return patch.absence();const key=path.slice('/storage/v1/object/info/cms-enquiry-files/'.length);return objects.has(key)?Response.json({name:key}):Response.json({code:'NoSuchKey',statusCode:'404'},{status:404});
 }};}
test('provider cleanup deletes only claimed paths and checks each missing object before finalization',async()=>{
 const remote=provider(),adapter=createEnquiryFileCleanupStorage(config,remote.fetcher);await assert.rejects(()=>adapter.remove(job.keys[0]),/not claimed/);assert.equal(remote.calls.length,0);
 assert.deepEqual(await dispatchEnquiryFileCleanup(adapter,site),{idle:0,deleted:1,retry:0,unacknowledged:0});assert.equal(remote.finished,1);assert.equal(remote.failed,0);assert.equal(remote.objects.size,0);await assert.rejects(()=>adapter.remove(job.keys[0]),/not claimed/);
});
test('generic missing routes, denied access and oversized errors never count as confirmed absence',async()=>{
 for(const absence of [()=>Response.json({code:'NoSuchBucket'},{status:404}),()=>Response.json({code:'AccessDenied'},{status:403}),()=>Response.json({code:'NoSuchKey',statusCode:403},{status:404}),()=>new Response('x'.repeat(65537),{status:404}),()=>{throw Error('network');}]){
  const remote=provider({absence}),adapter=createEnquiryFileCleanupStorage(config,remote.fetcher);const result=await dispatchEnquiryFileCleanup(adapter,site);assert.equal(result.retry,1);assert.equal(remote.finished,0);assert.equal(remote.failed,1);
 }
});
test('cleanup runtime requires explicit flags and secret and accepts only a private empty request',async()=>{
 assert.equal(enquiryFileCleanupConfig({}),null);const env={CMS_ENQUIRY_ENABLED:'true',CMS_ENQUIRY_FILES_ENABLED:'true',CMS_ENQUIRY_FILE_CLEANUP_ENABLED:'true',CMS_ENQUIRY_FILE_CLEANUP_SECRET:'s'.repeat(32),CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:config.url,CMS_SUPABASE_SERVICE_ROLE_KEY:config.serviceKey},remote=provider(),runtime=enquiryFileCleanupConfig(env,remote.fetcher);assert.ok(runtime);
 for(const name of ['CMS_ENQUIRY_ENABLED','CMS_ENQUIRY_FILES_ENABLED','CMS_ENQUIRY_FILE_CLEANUP_ENABLED'])assert.equal(enquiryFileCleanupConfig({...env,[name]:'false'}),null);
 const req=(patch={})=>new Request('https://site.test/api/cms/enquiry/files/cleanup',{method:'POST',headers:{authorization:`Bearer ${env.CMS_ENQUIRY_FILE_CLEANUP_SECRET}`},...patch});
 assert.equal((await handleEnquiryFileCleanup(req({headers:{}}),runtime)).status,401);assert.equal((await handleEnquiryFileCleanup(req({body:'{}'}),runtime)).status,400);assert.equal(remote.calls.length,0);
 const response=await handleEnquiryFileCleanup(req(),runtime);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,counts:{idle:0,deleted:1,retry:0,unacknowledged:0}});assert.match(response.headers.get('cache-control'),/no-store/);
});
test('dispatcher rejects foreign and duplicate work before claiming any file',async()=>{
 for(const jobs of [[{site:id(9),upload}],[{site,upload},{site,upload}]])await assert.rejects(()=>dispatchEnquiryFileCleanup({list:async()=>jobs,claim:async()=>assert.fail('must not claim')},site,2));
});
