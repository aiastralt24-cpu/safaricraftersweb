import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {handleEnquiryFileTransferHttp} from '../lib/cms/enquiry-file-transfer-http.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),token='a'.repeat(64),body=Buffer.from('resume'),hash=createHash('sha256').update(body).digest('hex'),base=`${site}/enquiries/${id(4)}/${id(6)}`;
const receipt={id:id(6),site,form:id(2),revision:id(3),request:id(4),field:'cv',filename:'cv.pdf',mime:'application/pdf',bytes:body.length,maxBytes:1000,sha256:hash,state:'reserved',storageKey:`${base}/original`,deliveryKey:`${base}/delivery.pdf`};
function request(options={}){return new Request('https://site.test/api/enquiry/file',{method:'POST',body,duplex:'half',...options,headers:{origin:'https://site.test',authorization:`Bearer ${token}`,'content-type':'application/pdf','x-cms-form':id(2),'x-cms-revision':id(3),'x-cms-request':id(4),'x-cms-session':id(5),'x-cms-upload':id(6),...options.headers}});}
function fixture(){const calls=[];const transfer={authorize:async()=>{calls.push('authorize');return receipt;},put:async(_,bytes)=>{calls.push('put');assert.deepEqual(bytes,body);},confirm:async()=>{calls.push('confirm');return {...receipt,state:'uploaded'};}};const config={site,origin:'https://site.test',adapterForRequest:async r=>{calls.push('adapter');assert.equal(r.bodyUsed,false);return {transfer,consumeRate:async()=>{calls.push('rate');return {allowed:true,retryAfter:60};}};}};return {calls,transfer,config};}
test('HTTP transfer authorizes before reading and again before storage with private receipts',async()=>{const f=fixture();const response=await handleEnquiryFileTransferHttp(request(),f.config);assert.equal(response.status,202);assert.deepEqual(await response.json(),{ok:true,result:{uploadId:id(6),status:'awaiting_verification'}});assert.deepEqual(f.calls,['adapter','rate','authorize','authorize','put','confirm']);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('access-control-allow-origin'),null);});
test('disabled, method, origin, credential and identity failures stop before adapters',async()=>{
 for(const [options,status] of [[{method:'GET',body:undefined},405],[{headers:{origin:'https://evil.test'}},403],[{headers:{'sec-fetch-site':'cross-site'}},403],[{headers:{authorization:'bad'}},401],[{headers:{'x-cms-session':'bad'}},400]]){const f=fixture();assert.equal((await handleEnquiryFileTransferHttp(request(options),f.config)).status,status);assert.deepEqual(f.calls,[]);}
 assert.equal((await handleEnquiryFileTransferHttp(request(),null)).status,503);
});
test('rate and authorization failures do not read bytes or reveal provider details',async()=>{
 const f=fixture();f.config.adapterForRequest=async()=>({transfer:f.transfer,consumeRate:async()=>({allowed:false,retryAfter:42})});const response=await handleEnquiryFileTransferHttp(request(),f.config);assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'42');assert.deepEqual(f.calls,[]);
 f.config.adapterForRequest=async()=>{throw Error('secret provider diagnostic');};const failed=await handleEnquiryFileTransferHttp(request(),f.config);assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/secret provider/);
});
test('MIME, declared length, truncation, oversize and checksum failures prevent writes',async()=>{
 for(const [options,status] of [[{headers:{'content-type':'image/png'}},415],[{headers:{'content-length':'6.0'}},413],[{headers:{'content-length':'7'}},413],[{body:Buffer.from('short')},422],[{body:Buffer.from('too long')},413],[{body:Buffer.from('change')},422]]){const f=fixture();assert.equal((await handleEnquiryFileTransferHttp(request(options),f.config)).status,status);assert.equal(f.calls.includes('put'),false);}
});
test('stalled and aborted request streams stop promptly without writes',async()=>{
 const f=fixture();f.config.readTimeoutMs=10;let cancelled=false;const stalled=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}});
 assert.equal((await handleEnquiryFileTransferHttp(request({body:stalled}),f.config)).status,408);assert.equal(cancelled,true);assert.equal(f.calls.includes('put'),false);
 const g=fixture(),controller=new AbortController();controller.abort();assert.equal((await handleEnquiryFileTransferHttp(request({signal:controller.signal}),g.config)).status,400);assert.equal(g.calls.includes('put'),false);
});
test('cancellation after body reading and lost confirmations remain unconfirmed',async()=>{
 const f=fixture();let auth=0;f.transfer.authorize=async()=>{if(++auth===2)throw Error('cancelled');return receipt;};assert.equal((await handleEnquiryFileTransferHttp(request(),f.config)).status,503);assert.equal(f.calls.includes('put'),false);
 const g=fixture();g.transfer.confirm=async()=>{throw Error('lost receipt');};assert.equal((await handleEnquiryFileTransferHttp(request(),g.config)).status,503);assert.equal(g.calls.includes('put'),true);
});
