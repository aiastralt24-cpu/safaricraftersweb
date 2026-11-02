import test from 'node:test';import assert from 'node:assert/strict';import {readLeadAttachmentResponse} from '../lib/cms/lead-attachments.ts';
const file={filename:'CV.png',mime:'image/webp',bytes:3};
test('client download checks exact MIME and bounded bytes before creating a downloadable blob',async()=>{
 const value=await readLeadAttachmentResponse(new Response('abc',{headers:{'content-type':'image/webp','content-length':'3'}}),file);assert.equal(value.filename,'CV.webp');assert.equal(await value.blob.text(),'abc');
 for(const response of [new Response('abc',{status:403}),new Response('abc',{headers:{'content-type':'text/html'}}),new Response('ab',{headers:{'content-type':'image/webp'}}),new Response('abcd',{headers:{'content-type':'image/webp'}})])await assert.rejects(()=>readLeadAttachmentResponse(response,file));
});
