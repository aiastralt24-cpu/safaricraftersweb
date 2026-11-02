import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnquiryRpc,createEnquiryIntakeAdapter} from '../lib/cms/enquiry-database.ts';
const site='00000000-0000-4000-8000-000000000001';
test('service RPC restricts destinations/procedures and never returns upstream error bodies',async()=>{
 let request;const rpc=createEnquiryRpc({url:'https://database.example.test',serviceKey:'synthetic-test-key'},async(url,options)=>{request={url:String(url),options};return Response.json({allowed:true,retryAfter:10});});
 assert.deepEqual(await rpc('consume_enquiry_rate',{p_site:site}),{allowed:true,retryAfter:10});assert.equal(request.url,'https://database.example.test/rest/v1/rpc/consume_enquiry_rate');assert.equal(request.options.redirect,'error');assert.equal(request.options.cache,'no-store');assert.equal(request.options.headers['Content-Profile'],'cms');
 await assert.rejects(rpc('arbitrary_procedure',{}),/Invalid enquiry operation/);
 for(const url of ['http://database.example.test','https://secret@database.example.test','https://database.example.test/path','https://database.example.test?key=value'])assert.throws(()=>createEnquiryRpc({url,serviceKey:'test'}),/not configured/);
 const failure=createEnquiryRpc({url:'https://database.example.test',serviceKey:'test'},async()=>new Response('upstream credentials and private enquiry',{status:500}));await assert.rejects(failure('accept_enquiry',{}),error=>error.message==='Enquiry database operation failed.');
});
test('adapter scopes keyed rate identity, binds site and refuses arbitrary attachment proof',async()=>{
 const calls=[];const config={site,trustedIdentity:'trusted-ingress-identity',identitySecret:'x'.repeat(32),verifyChallenge:async token=>token==='valid',rpc:async(name,args)=>{calls.push({name,args});return {allowed:true,retryAfter:10};}};
 const adapter=createEnquiryIntakeAdapter(config);await adapter.consumeRate();const digest=calls[0].args.p_actor_digest;assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(calls).includes(config.trustedIdentity),false);
 await createEnquiryIntakeAdapter({...config,identitySecret:'y'.repeat(32)}).consumeRate();assert.notEqual(calls[1].args.p_actor_digest,digest);assert.equal(await adapter.verifyChallenge('invalid'),false);assert.deepEqual(await adapter.files(site,site,{upload:'forged'}),[]);
 await adapter.read(site,site,site);assert.equal(calls.at(-1).args.p_site,site);
 await assert.rejects(adapter.persist({site:'different',form:site,revision:site,request:site,answers:{},consents:[],attribution:{}}),/mismatch/);
 assert.throws(()=>createEnquiryIntakeAdapter({...config,identitySecret:'short'}),/not configured/);
});

test('adapter routes expedition submissions to atomic context persistence without accepting browser attribution',async()=>{
 const calls=[],adapter=createEnquiryIntakeAdapter({site,trustedIdentity:'ingress',identitySecret:'x'.repeat(32),verifyChallenge:async()=>true,rpc:async(name,args)=>{calls.push({name,args});return {};}});
 const input={site,form:site,revision:site,request:site,answers:{name:'Guest'},consents:[],attribution:{sourcePath:'/photo-expeditions/forest'},expedition:{recordId:site,revisionId:site,slug:'forest',departureId:null}};
 await adapter.persist(input);assert.deepEqual(calls[0],{name:'accept_expedition_enquiry',args:{p_site:site,p_form:site,p_revision:site,p_request:site,p_answers:input.answers,p_consents:[],p_source_path:input.attribution.sourcePath,p_selection:input.expedition}});
 const {expedition,...plain}=input;await adapter.persist(plain);assert.equal(calls[1].name,'accept_enquiry');assert.deepEqual(calls[1].args.p_attribution,plain.attribution);
});

test('career submissions use atomic job-context persistence rather than generic attribution',async()=>{
 const calls=[],adapter=createEnquiryIntakeAdapter({site,trustedIdentity:'ingress',identitySecret:'x'.repeat(32),verifyChallenge:async()=>true,rpc:async(name,args)=>{calls.push({name,args});return {};}});
 const input={site,form:site,revision:site,request:site,answers:{name:'Applicant'},consents:[],attribution:{sourcePath:'/careers/advisor'},career:{recordId:site,revisionId:site,slug:'advisor'}};
 await adapter.persist(input);assert.deepEqual(calls[0],{name:'accept_career_enquiry',args:{p_site:site,p_form:site,p_revision:site,p_request:site,p_answers:input.answers,p_consents:[],p_source_path:'/careers/advisor',p_selection:input.career}});
 await assert.rejects(()=>adapter.persist({...input,expedition:{recordId:site,revisionId:site,slug:'forest',departureId:null}}),/one enquiry context/);assert.equal(calls.length,1);
});

test('service adapter rejects stripped or mismatched career source context before persistence',async()=>{
 const adapter=createEnquiryIntakeAdapter({site,trustedIdentity:'ingress',identitySecret:'x'.repeat(32),verifyChallenge:async()=>true,rpc:async()=>assert.fail('unexpected RPC')});
 const input={site,form:site,revision:site,request:site,answers:{},consents:[],attribution:{sourcePath:'/careers/advisor'}};
 await assert.rejects(adapter.persist(input),/Career source context mismatch/);
 await assert.rejects(adapter.persist({...input,career:{recordId:site,revisionId:site,slug:'other'}}),/Career source context mismatch/);
});
