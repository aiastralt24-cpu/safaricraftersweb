import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {handleDocumentPreview,readPrivateDocument} from '../lib/cms/document-preview.ts';
const site='00000000-0000-4000-8000-000000000001',asset='00000000-0000-4000-8000-000000000002',record='00000000-0000-4000-8000-000000000003',revision='00000000-0000-4000-8000-000000000004';
const bytes=Buffer.from('%PDF-1.7\nfixture'),file={site,id:asset,record,revision,key:`${site}/${asset}/delivery.pdf`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const request=(extra='',headers={})=>new Request(`https://site.test/api/cms/document-preview?site=${site}&asset=${asset}&record=${record}&revision=${revision}${extra}`,{headers:{authorization:'Bearer a.b.c',...headers}});
const response=()=>new Response(bytes,{headers:{'content-type':'application/pdf'}});
test('private PDF preview checks revision identity twice and returns verified noncached bytes',async()=>{
 let checks=0;const result=await handleDocumentPreview(request(),{authorize:async(token,q)=>{checks++;assert.equal(token,'a.b.c');assert.deepEqual(q,{site,asset,record,revision});return file;},read:async(token,value)=>{assert.equal(token,'a.b.c');assert.deepEqual(value,file);return response();}});
 assert.equal(checks,2);assert.equal(result.status,200);assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes);assert.match(result.headers.get('cache-control'),/no-store/);assert.match(result.headers.get('content-security-policy'),/sandbox/);assert.equal(result.headers.get('x-content-type-options'),'nosniff');
});
test('PDF previews reject missing authorization, duplicate parameters and foreign revision descriptors before reading',async()=>{
 const backend={authorize:async()=>file,read:()=>assert.fail('Unauthorized bytes read')};
 assert.equal((await handleDocumentPreview(request('',{authorization:''}),backend)).status,401);
 assert.equal((await handleDocumentPreview(request(`&revision=${revision}`),backend)).status,400);
 for(const change of [{site:record},{record:site},{revision:site},{id:site},{key:'foreign/path'},{privateToken:'secret'}])assert.equal((await handleDocumentPreview(request(),{...backend,authorize:async()=>({...file,...change})})).status,change.privateToken?404:503);
 assert.equal((await handleDocumentPreview(request(),{...backend,authorize:async()=>null})).status,404);
});
test('corrupt or oversized files and revoked access never return PDF bytes',async()=>{
 for(const data of [new Response(bytes,{headers:{'content-type':'text/html'}}),new Response(bytes.subarray(1),{headers:{'content-type':'application/pdf'}}),new Response(Buffer.concat([bytes,bytes]),{headers:{'content-type':'application/pdf'}}),new Response(Buffer.alloc(bytes.length),{headers:{'content-type':'application/pdf'}})])assert.equal((await handleDocumentPreview(request(),{authorize:async()=>file,read:async()=>data})).status,503);
 for(const value of [null,{...file,sha256:'b'.repeat(64)}]){let checks=0;const result=await handleDocumentPreview(request(),{authorize:async()=>++checks===1?file:value,read:async()=>response()});assert.equal(result.status,403);assert.equal((await result.text()).includes('%PDF'),false);}
});
test('document storage uses caller credentials, fixed private bucket and rejects untrusted paths/configuration',async()=>{
 let calls=0;await readPrivateDocument({url:'https://cms.test',key:'anon'},'a.b.c',file,async(url,options)=>{calls++;assert.equal(url.pathname,`/storage/v1/object/authenticated/cms-document-media/${file.key}`);assert.equal(options.headers.Authorization,'Bearer a.b.c');assert.equal(options.redirect,'error');return response();});assert.equal(calls,1);
 for(const config of [{url:'http://cms.test',key:'anon'},{url:'https://cms.test/path',key:'anon'}])await assert.rejects(readPrivateDocument(config,'a.b.c',file,()=>assert.fail()));
 await assert.rejects(readPrivateDocument({url:'https://cms.test',key:'anon'},'a.b.c',{...file,key:'../original'},()=>assert.fail()));
});
