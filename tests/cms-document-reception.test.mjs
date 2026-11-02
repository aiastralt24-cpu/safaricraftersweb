import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createDocumentReceptionAdapter,receiveDocuments} from '../lib/cms/document-reception.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const config={url:'https://cms.test',serviceKey:'worker-secret'},bytes=Buffer.from('PDF'),descriptor={site,id,key:`${site}/${id}/original`,mime:'application/pdf',bytes:3};
test('PDF reception streams and hashes exact stored bytes using trusted reservation identity',async()=>{
 const calls=[];const adapter=createDocumentReceptionAdapter(config,async(url,options)=>{calls.push({url,options});if(url.pathname.endsWith('get_document_reception'))return Response.json(descriptor);if(url.pathname.endsWith('confirm_upload'))return new Response(null,{status:204});return new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,1));c.enqueue(bytes.subarray(1));c.close();}}));});
 assert.equal(await adapter.confirm(site,id),'confirmed');assert.equal(calls.length,3);
 assert.equal(calls[1].url.pathname,`/storage/v1/object/cms-document-originals/${site}/${id}/original`);
 assert.deepEqual(JSON.parse(calls[2].options.body),{p_site:site,p_upload:id,p_sha256:createHash('sha256').update(bytes).digest('hex'),p_bytes:3});
 for(const {options}of calls){assert.equal(options.headers.Authorization,'Bearer worker-secret');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');}
});
test('PDF reception rejects foreign descriptors and partial/oversized streams before confirmation',async()=>{
 for(const patch of [{site:id},{id:site},{key:'other/file'},{mime:'image/png'},{bytes:25000001},{privateToken:'secret'}]){let count=0;const a=createDocumentReceptionAdapter(config,async()=>{count++;return Response.json({...descriptor,...patch});});await assert.rejects(a.confirm(site,id));assert.equal(count,1);}
 for(const response of [new Response('PD'),new Response('PDF!'),new Response(bytes,{headers:{'content-length':'2'}}),new Response(null,{status:404})]){
 let count=0;const a=createDocumentReceptionAdapter(config,async()=>{count++;return count===1?Response.json(descriptor):response;});await assert.rejects(a.confirm(site,id));assert.equal(count,2);
 }
 assert.equal(await createDocumentReceptionAdapter(config,async()=>Response.json(null)).confirm(site,id),'not_reserved');
});
test('reception discovery is bounded, unique and sequential; lost acknowledgements remain recoverable',async()=>{
 let concurrent=0,max=0;const other={site,id:site};const adapter={list:async()=>[{site,id},other],confirm:async(_site,key)=>{concurrent++;max=Math.max(max,concurrent);await Promise.resolve();concurrent--;if(key===id)throw Error('lost');return 'confirmed';}};
 assert.deepEqual((await receiveDocuments(adapter,2)).map(x=>x.status),['unacknowledged','confirmed']);assert.equal(max,1);
 for(const values of [[{site,id},{site,id}],[{site,id:'bad'}],[{site,id},other]])await assert.rejects(receiveDocuments({...adapter,list:async()=>values,confirm:()=>assert.fail('Invalid batch ran')},1));
 for(const limit of [0,21,1.5])await assert.rejects(receiveDocuments(adapter,limit));
});
test('worker configuration and provider errors never expose private diagnostics',async()=>{
 for(const url of ['http://cms.test','https://cms.test/path','https://user:secret@cms.test'])assert.throws(()=>createDocumentReceptionAdapter({...config,url}));
 await assert.rejects(createDocumentReceptionAdapter(config,async()=>Response.json({secret:'private diagnostics'},{status:500})).confirm(site,id),e=>!e.message.includes('private diagnostics'));
});
