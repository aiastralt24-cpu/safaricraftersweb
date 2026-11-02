import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {handleDocumentDownload,createDocumentDownloadAdapter} from '../lib/cms/document-download.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',record='00000000-0000-4000-8000-000000000003',revision='00000000-0000-4000-8000-000000000004';
const bytes=Buffer.from('%PDF-1.7\nfixture'),file={site,id,record,revision,key:`${site}/${id}/delivery.pdf`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),downloadName:'Safari “guide”.pdf',label:'Download',access:'public',expired:false};
const request=(query=`record=${record}`,headers={})=>new Request(`https://site.test/api/documents/download?${query}`,{headers});
const data=()=>new Response(bytes,{headers:{'content-type':'application/pdf'}});
test('published PDF download verifies bytes and access twice with safe attachment headers',async()=>{
 for(const token of [null,'a.b.c']){
  let checks=0;const backend={site,authorize:async(t,r)=>{checks++;assert.equal(t,token);assert.equal(r,record);return {...file,access:token?'authenticated':'public'};},read:async()=>data()};
  const response=await handleDocumentDownload(request(undefined,token?{authorization:`Bearer ${token}`}:{cookie:'untrusted=anything'}),backend);
  assert.equal(response.status,200);assert.equal(checks,2);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.match(response.headers.get('content-disposition'),/^attachment; filename="document.pdf"; filename\*=UTF-8''Safari%20/);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('vary'),'Authorization');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 }
});
test('download rejects disabled delivery, ambiguous input, malformed credentials and unauthorized descriptors before storage',async()=>{
 let calls=0;const backend={site,authorize:async()=>{calls++;return file;},read:async()=>assert.fail('Must not read storage')};
 assert.equal((await handleDocumentDownload(request(),null)).status,404);
 for(const query of ['',`record=${record}&record=${record}`,`record=${record}&site=${site}`,'record=bad'])assert.equal((await handleDocumentDownload(request(query),backend)).status,400);
 assert.equal((await handleDocumentDownload(request(undefined,{authorization:'invalid'}),backend)).status,401);assert.equal(calls,0);
 for(const value of [null,{...file,access:'authenticated'},{...file,site:record},{...file,record:site},{...file,key:'../original'},{...file,downloadName:'bad\nname.pdf'},{...file,secret:'private'}])assert.equal((await handleDocumentDownload(request(),{...backend,authorize:async()=>value})).status,404);
});
test('download never releases corrupt bytes or a file withdrawn or replaced during transfer',async()=>{
 const bad=[()=>new Response(bytes,{headers:{'content-type':'text/html'}}),()=>new Response(bytes,{headers:{'content-type':'application/pdf','content-length':'1'}}),()=>new Response(bytes.subarray(1),{headers:{'content-type':'application/pdf'}}),()=>new Response(Buffer.concat([bytes,bytes]),{headers:{'content-type':'application/pdf'}}),()=>new Response(Buffer.alloc(bytes.length),{headers:{'content-type':'application/pdf'}})];
 for(const read of bad){const response=await handleDocumentDownload(request(),{site,authorize:async()=>file,read});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('%PDF'));}
 for(const changed of [null,{...file,revision:site},{...file,access:'authenticated'},{...file,expired:true}]){let calls=0;const response=await handleDocumentDownload(request(),{site,authorize:async()=>++calls===1?file:changed,read:async()=>data()});assert.equal(response.status,403);assert.ok(!(await response.text()).includes('%PDF'));}
 const response=await handleDocumentDownload(request(),{site,authorize:async()=>{throw Error('secret upstream credentials');},read:async()=>data()});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('secret'));
});
test('download adapter confines service credentials to validated private storage and forwards visitor identity to authorization',async()=>{
 const calls=[],config={site,url:'https://cms.test',anonKey:'anon.key.jwt',serviceKey:'private.service.key'};
 const adapter=createDocumentDownloadAdapter(config,async(url,options)=>{calls.push({url:String(url),options});return String(url).includes('/rpc/')?Response.json(file):data();});
 await adapter.authorize(null,record);await adapter.authorize('visitor.token.jwt',record);await adapter.read(file);
 assert.equal(calls[0].options.headers.Authorization,'Bearer anon.key.jwt');assert.equal(calls[1].options.headers.Authorization,'Bearer visitor.token.jwt');assert.equal(calls[1].options.headers.apikey,config.anonKey);
 assert.equal(calls[2].options.headers.Authorization,'Bearer private.service.key');assert.equal(calls[2].url,`https://cms.test/storage/v1/object/authenticated/cms-document-media/${file.key}`);
 for(const call of calls){assert.equal(call.options.cache,'no-store');assert.equal(call.options.redirect,'error');assert.ok(call.options.signal);}
 await assert.rejects(adapter.read({...file,site:record}));await assert.rejects(adapter.read({...file,key:'../original'}));assert.equal(calls.length,3);
 for(const change of [{url:'http://cms.test'},{url:'https://cms.test/path'},{serviceKey:''},{site:'bad'}])assert.throws(()=>createDocumentDownloadAdapter({...config,...change}));
});

test('pinned download links refuse replaced versions without fetching bytes and keep stable links current',async()=>{
 const {documentDownloadHref}=await import('../lib/cms/document-download-link.ts');
 assert.equal(documentDownloadHref(record),`/documents/${record}`);assert.equal(documentDownloadHref(record,revision),`/documents/${record}?revision=${revision}`);assert.throws(()=>documentDownloadHref('../record',revision));assert.throws(()=>documentDownloadHref(record,'bad'));assert.throws(()=>documentDownloadHref(record,''));
 let reads=0;const backend={site,authorize:async()=>file,read:async()=>{reads++;return data();}};
 const replaced=await handleDocumentDownload(request(`record=${record}&revision=${site}`),backend);assert.equal(replaced.status,409);assert.match(await replaced.text(),/replaced/);assert.equal(reads,0);
 assert.equal((await handleDocumentDownload(request(`record=${record}&revision=${revision}`),backend)).status,200);assert.equal(reads,1);
 for(const query of [`record=${record}&revision=bad`,`record=${record}&revision=${revision}&revision=${revision}`,`record=${record}&revision=${revision}&site=${site}`])assert.equal((await handleDocumentDownload(request(query),backend)).status,400);
 assert.equal(reads,1);
});
