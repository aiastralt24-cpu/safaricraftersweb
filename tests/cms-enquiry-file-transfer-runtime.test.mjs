import test from 'node:test';import assert from 'node:assert/strict';import {createHash,createHmac} from 'node:crypto';
import {enquiryFileTransferHttpConfig} from '../lib/cms/enquiry-file-transfer-runtime.ts';
import {handleEnquiryFileTransferHttp} from '../lib/cms/enquiry-file-transfer-http.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),secret='s'.repeat(32),token='a'.repeat(64),bytes=Buffer.from('resume'),base=`${site}/enquiries/${id(4)}/${id(6)}`;
const env={CMS_ENQUIRY_ENABLED:'true',CMS_ENQUIRY_FILES_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_PUBLIC_SITE_ORIGIN:'https://site.test',CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key',CMS_ENQUIRY_INGRESS_SECRET:secret,CMS_ENQUIRY_IDENTITY_SECRET:'i'.repeat(32)};
const receipt={id:id(6),site,form:id(2),revision:id(3),request:id(4),field:'cv',filename:'cv.pdf',mime:'application/pdf',bytes:bytes.length,maxBytes:1000,sha256:createHash('sha256').update(bytes).digest('hex'),state:'reserved',storageKey:`${base}/original`,deliveryKey:`${base}/delivery.pdf`};
function request(signed=true){const timestamp=String(Math.floor(Date.now()/1000)),ip='203.0.113.10';return new Request('https://site.test/api/enquiry/file',{method:'POST',body:bytes,headers:{origin:'https://site.test',authorization:`Bearer ${token}`,'content-type':'application/pdf','x-cms-form':id(2),'x-cms-revision':id(3),'x-cms-request':id(4),'x-cms-session':id(5),'x-cms-upload':id(6),...(signed?{'x-cms-client-ip':ip,'x-cms-ingress-timestamp':timestamp,'x-cms-ingress-signature':createHmac('sha256',secret).update(`${timestamp}\n${ip}`).digest('hex')}:{'x-forwarded-for':ip})}});}
test('attachment runtime defaults off and rejects incomplete or unsafe configuration',()=>{
 assert.equal(enquiryFileTransferHttpConfig({}),null);
 for(const patch of [{CMS_ENQUIRY_FILES_ENABLED:'false'},{CMS_ENQUIRY_ENABLED:'false'},{CMS_WEBSITE_ID:'bad'},{CMS_PUBLIC_SITE_ORIGIN:'http://site.test'},{CMS_PUBLIC_SITE_ORIGIN:' https://site.test'},{CMS_ENQUIRY_INGRESS_SECRET:'short'},{CMS_ENQUIRY_IDENTITY_SECRET:'short'},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(enquiryFileTransferHttpConfig({...env,...patch}),null);
});
test('trusted ingress, shared rate window, private storage and confirmation compose without inspection',async()=>{
 const calls=[];const config=enquiryFileTransferHttpConfig(env,async(url,options)=>{
  calls.push(url.pathname);assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,`Bearer ${env.CMS_SUPABASE_SERVICE_ROLE_KEY}`);
  if(url.pathname.endsWith('consume_enquiry_rate')){const args=JSON.parse(options.body);assert.deepEqual(args,{p_site:site,p_actor_digest:createHmac('sha256',env.CMS_ENQUIRY_IDENTITY_SECRET).update(site).update('\0').update('203.0.113.10').digest('hex')});return Response.json({allowed:true,retryAfter:60});}
  if(url.pathname.endsWith('get_enquiry_file_transfer')){assert.equal(JSON.parse(options.body).p_token_hash,createHash('sha256').update(token).digest('hex'));return Response.json(receipt);}
  if(url.pathname.endsWith('confirm_enquiry_file'))return Response.json({...receipt,state:'uploaded'});
  assert.equal(url.pathname,`/storage/v1/object/cms-enquiry-files/${base}/original`);if(options.method==='POST'){assert.equal(options.headers['x-upsert'],'false');return Response.json({});}return new Response(bytes);
 });
 assert.equal((await handleEnquiryFileTransferHttp(request(),config)).status,202);assert.equal(calls.length,6);
 const count=calls.length;assert.equal((await handleEnquiryFileTransferHttp(request(false),config)).status,503);assert.equal(calls.length,count);
});
test('runtime rate rejection prevents session queries and storage',async()=>{
 const calls=[];const config=enquiryFileTransferHttpConfig(env,async(url)=>{calls.push(url.pathname);return Response.json({allowed:false,retryAfter:120});});
 const response=await handleEnquiryFileTransferHttp(request(),config);assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'120');assert.deepEqual(calls,['/rest/v1/rpc/consume_enquiry_rate']);
});
