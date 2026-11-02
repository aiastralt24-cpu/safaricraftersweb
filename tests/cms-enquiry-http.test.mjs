import test from 'node:test';
import assert from 'node:assert/strict';
import {handleEnquiryHttp} from '../lib/cms/enquiry-http.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const site='00000000-0000-4000-8000-000000000001';
const body={formId:site,revisionId:site,requestKey:site,challengeToken:'challenge',answers:{name:'Synthetic guest'}};
const request=(value=JSON.stringify(body),headers={})=>new Request('https://api.example.test/enquiry',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',...headers},body:value});
const adapter={consumeRate:async()=>({allowed:true,retryAfter:120}),verifyChallenge:async()=>true,read:async()=>({websiteId:site,formId:site,revisionId:site,definition:newForm('name')}),files:async()=>[],persist:async()=>({leadId:site,receivedAt:'2026-10-22T12:00:00Z',replayed:false})};
const config={site,origin:'https://example.test',adapterForRequest:async()=>adapter};
test('HTTP intake returns success only after persistence with private non-cacheable response',async()=>{
 const result=await handleEnquiryHttp(request(),config);assert.equal(result.status,200);assert.equal((await result.json()).ok,true);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('access-control-allow-origin'),null);
 const limited=await handleEnquiryHttp(request(),{...config,adapterForRequest:async()=>({...adapter,consumeRate:async()=>({allowed:false,retryAfter:120})})});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'120');
});
test('origin, encoding and body limits reject requests before trusted service creation',async()=>{
 const never={...config,adapterForRequest:async()=>assert.fail('unexpected adapter creation')};
 for(const [req,status]of [[request('{}',{Origin:'https://other.test'}),403],[request('{}',{Origin:''}),403],[request('{}',{'Sec-Fetch-Site':'cross-site'}),403],[request('{}',{'Content-Type':'text/plain'}),415],[request('{'),400],[request(new Uint8Array([0xff])),400],[request('x'.repeat(350001)),413],[request('{}',{'Content-Length':'350001'}),413]])assert.equal((await handleEnquiryHttp(req,never)).status,status);
 assert.equal((await handleEnquiryHttp(request(),null)).status,503);assert.equal((await handleEnquiryHttp(request(),{...never,origin:'https://example.test/path'})).status,503);
 assert.equal((await handleEnquiryHttp(new Request('https://api.example.test/enquiry'),never)).status,405);
});
test('adapter failures do not leak internal details or claim a saved enquiry',async()=>{
 const result=await handleEnquiryHttp(request(),{...config,adapterForRequest:async()=>{throw Error('private service secret');}});assert.equal(result.status,503);assert.equal((await result.text()).includes('private service secret'),false);
});
