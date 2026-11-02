import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createTurnstileVerifier} from '../lib/cms/turnstile.ts';
import {verifiedIngressIdentity,enquiryHttpConfig} from '../lib/cms/enquiry-runtime.ts';
import {handleEnquiryHttp} from '../lib/cms/enquiry-http.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const site='00000000-0000-4000-8000-000000000001',secret='s'.repeat(32);
const env={CMS_ENQUIRY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_PUBLIC_SITE_ORIGIN:'https://example.test',CMS_SUPABASE_URL:'https://db.example.test',CMS_SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key',CMS_TURNSTILE_SECRET:'synthetic-challenge-key',CMS_ENQUIRY_INGRESS_SECRET:secret,CMS_ENQUIRY_IDENTITY_SECRET:'i'.repeat(32)};
function ingress(ip='203.0.113.10',time=Math.floor(Date.now()/1000)){const timestamp=String(time);return {'x-cms-client-ip':ip,'x-cms-ingress-timestamp':timestamp,'x-cms-ingress-signature':createHmac('sha256',secret).update(`${timestamp}\n${ip}`).digest('hex')};}
test('challenge verifies exact hostname/action and rejects network/malformed/oversized tokens',async()=>{
 for(const body of [{success:false},{success:true,hostname:'other.test',action:'cms_enquiry'},{success:true,hostname:'example.test',action:'login'},null])assert.equal(await createTurnstileVerifier({secret,hostname:'example.test',action:'cms_enquiry'},async()=>Response.json(body))('token'),false);
 let sent;const verify=createTurnstileVerifier({secret,hostname:'example.test',action:'cms_enquiry'},async(url,options)=>{sent={url,options};return Response.json({success:true,hostname:'example.test',action:'cms_enquiry'});});
 assert.equal(await verify('token'),true);assert.equal(sent.url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(sent.options.redirect,'error');assert.equal(await verify('x'.repeat(2049)),false);
 assert.equal(await createTurnstileVerifier({secret,hostname:'example.test',action:'cms_enquiry'},async()=>{throw Error('network');})('token'),false);
});
test('ingress identity requires valid recent signature and normalizes IPv6',()=>{
 const now=Date.now(),request=headers=>new Request('https://example.test',{headers});assert.equal(verifiedIngressIdentity(request(ingress()),secret,now),'203.0.113.10');
 assert.equal(verifiedIngressIdentity(request(ingress('2001:db8:0:0:0:0:0:1')),secret,now),'2001:db8::1');
 for(const headers of [{},ingress('not-an-ip'),ingress('203.0.113.10',Math.floor(now/1000)-61),{...ingress(),'x-cms-client-ip':'203.0.113.11'},{...ingress(),'x-cms-ingress-signature':'0'.repeat(64)}])assert.throws(()=>verifiedIngressIdentity(request(headers),secret,now),/unavailable/);
});
test('configured runtime composes signed ingress, challenge, rate, form read and storage without fallback',async()=>{
 let saved=0;const calls=[];const fetcher=async(url,options)=>{calls.push(String(url));if(String(url).includes('challenges.cloudflare.com'))return Response.json({success:true,hostname:'example.test',action:'cms_enquiry'});if(String(url).endsWith('consume_enquiry_rate'))return Response.json({allowed:true,retryAfter:600});if(String(url).endsWith('get_enquiry_input'))return Response.json({websiteId:site,formId:site,revisionId:site,definition:newForm('name')});if(String(url).endsWith('accept_enquiry')){saved++;return Response.json({leadId:site,receivedAt:'2026-10-22T12:00:00Z',replayed:false});}assert.fail('unexpected URL');};
 const config=enquiryHttpConfig(env,fetcher);assert.ok(config);const request=extra=>new Request('https://example.test/api/cms/enquiry',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',...extra},body:JSON.stringify({formId:site,revisionId:site,requestKey:site,answers:{name:'Guest'},challengeToken:'test-token'})});
 assert.equal((await handleEnquiryHttp(request(ingress()),config)).status,200);assert.equal(saved,1);assert.equal(calls.length,4);
 assert.equal((await handleEnquiryHttp(request({}),config)).status,503);assert.equal(saved,1);assert.equal(calls.length,4);
 for(const patch of [{CMS_ENQUIRY_ENABLED:'false'},{CMS_TURNSTILE_SECRET:''},{CMS_ENQUIRY_INGRESS_SECRET:'short'},{CMS_SUPABASE_SERVICE_ROLE_KEY:''}])assert.equal(enquiryHttpConfig({...env,...patch},fetcher),null);
});

test('attachment intake binds header proof to body scope and uses only atomic persistence',async()=>{
 const form=newForm('name');form.fields.push({id:'cv',type:'file',label:'CV',help:'',required:true,validationMessage:'',mimeTypes:['application/pdf'],maxBytes:1000});
 const token='a'.repeat(64),calls=[];
 const fetcher=async(url,options)=>{
  const path=String(url);if(path.includes('challenges.cloudflare.com'))return Response.json({success:true,hostname:'example.test',action:'cms_enquiry'});
  const args=JSON.parse(options.body);calls.push({path,args});
  if(path.endsWith('consume_enquiry_rate'))return Response.json({allowed:true,retryAfter:60});
  if(path.endsWith('get_enquiry_input'))return Response.json({websiteId:site,formId:site,revisionId:site,definition:form});
  if(path.endsWith('get_enquiry_file_evidence')){assert.deepEqual(args.p_files,[{fieldId:'cv',uploadId:site}]);assert.equal(args.p_session,site);assert.notEqual(args.p_token_hash,token);return Response.json([{fieldId:'cv',uploadId:site,mimeType:'application/pdf',byteSize:100,available:true}]);}
  assert.ok(path.endsWith('accept_enquiry_attachments'));assert.deepEqual(args.p_context,{});assert.equal(args.p_answers.cv,site);assert.deepEqual(args.p_attribution,{});assert.equal(JSON.stringify(args).includes(token),false);
  return Response.json({leadId:site,receivedAt:'2026-10-22T12:00:00Z',replayed:true});
 };
 const headers={...ingress(),origin:'https://example.test','content-type':'application/json',authorization:`Bearer ${token}`,'x-cms-form':site,'x-cms-revision':site,'x-cms-request':site,'x-cms-session':site};
 const request=(patch={})=>new Request('https://example.test/api/cms/enquiry',{method:'POST',headers:{...headers,...patch},body:JSON.stringify({formId:site,revisionId:site,requestKey:site,answers:{name:'Applicant',cv:site},challengeToken:'check'})});
 const config=enquiryHttpConfig({...env,CMS_ENQUIRY_FILES_ENABLED:'true'},fetcher);
 assert.equal((await handleEnquiryHttp(request(),config)).status,200);assert.equal(calls.length,4);
 calls.length=0;assert.equal((await handleEnquiryHttp(request(),enquiryHttpConfig(env,fetcher))).status,503);assert.equal(calls.length,0);
 for(const patch of [{authorization:'Bearer bad'},{'x-cms-session':''},{'x-cms-request':'00000000-0000-4000-8000-000000000002'}]){
  calls.length=0;assert.equal((await handleEnquiryHttp(request(patch),config)).status,503);assert.equal(calls.some(c=>c.path.endsWith('accept_enquiry_attachments')||c.path.endsWith('get_enquiry_file_evidence')),false);
 }
});
