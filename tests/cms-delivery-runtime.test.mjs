import test from 'node:test';import assert from 'node:assert/strict';import {deliveryRuntime,handleDeliveryRun} from '../lib/cms/delivery-runtime.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',secret='s'.repeat(40),env={CMS_DELIVERY_WORKER_ENABLED:'true',CMS_DELIVERY_WORKER_SECRET:secret,CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://cms.example',CMS_SUPABASE_SERVICE_ROLE_KEY:'private-key'};
const job={id,websiteId:id,recordId:id,revisionId:id,operation:'unpublish',path:null,locale:'en',contentType:'testimonial',leaseToken:id,attempt:1};
const request=(suffix='',auth=`Bearer ${secret}`)=>new Request(`https://site.example/api/cms/workers/delivery${suffix}`,{headers:{authorization:auth}});
function fixture({batch=[job],failRefresh=false,failFinish=false}={}){const calls=[];let refreshes=0;const config=deliveryRuntime(()=>{refreshes++;if(failRefresh)throw Error('PRIVATE_REFRESH');},env,async(url,opts)=>{const name=new URL(url).pathname.split('/').at(-1);calls.push({name,args:JSON.parse(opts.body),opts});if(name==='reap_site_delivery')return Response.json(0);if(name==='claim_site_delivery')return Response.json(batch);if(failFinish)return Response.json({secret:'PRIVATE_UPSTREAM'},{status:500});return new Response(null,{status:204});});return {config,calls,refreshes:()=>refreshes};}
test('delivery worker is disabled by default and rejects unauthorized or caller-directed runs',async()=>{
 assert.equal(deliveryRuntime(()=>{},{}),null);const f=fixture();assert.equal((await handleDeliveryRun(request(),null)).status,503);assert.equal((await handleDeliveryRun(request('', 'Bearer wrong'),f.config)).status,401);assert.equal((await handleDeliveryRun(request('?site=other'),f.config)).status,400);assert.equal((await handleDeliveryRun(new Request('https://site.example',{method:'POST',headers:{authorization:`Bearer ${secret}`},body:'{}'}),f.config)).status,400);assert.equal(f.calls.length,0);
});
test('site-scoped jobs invalidate shared content before fenced completion without returning private fields',async()=>{
 const f=fixture(),response=await handleDeliveryRun(request(),f.config);assert.equal(response.status,200);assert.equal(f.refreshes(),1);assert.deepEqual(f.calls.map(c=>c.name),['reap_site_delivery','claim_site_delivery','finish_delivery']);assert.equal(f.calls[1].args.p_site,id);assert.deepEqual(f.calls[2].args,{p_job:id,p_token:id,p_success:true,p_error_code:null});assert.equal((await response.json()).succeeded,1);assert.ok(f.calls.every(c=>c.opts.redirect==='error'&&c.opts.cache==='no-store'));
});
test('foreign, duplicate and malformed claims never invalidate or acknowledge',async()=>{
 for(const batch of [[{...job,websiteId:other}],[job,job],[{...job,attempt:99}]]){const f=fixture({batch}),res=await handleDeliveryRun(request(),f.config);assert.equal(res.status,503);assert.equal(f.refreshes(),0);assert.equal(f.calls.length,2);}
});
test('refresh failure retries and lost acknowledgement is never reported as success',async()=>{
 const failed=fixture({failRefresh:true});const r=await handleDeliveryRun(request(),failed.config);assert.equal(r.status,503);assert.equal(failed.calls[2].args.p_error_code,'invalidation_failed');assert.equal((await r.json()).retryPending,1);
 const lost=fixture({failFinish:true});const body=await (await handleDeliveryRun(request(),lost.config)).json();assert.equal(body.unacknowledged,1);assert.equal(JSON.stringify(body).includes('PRIVATE'),false);
});
