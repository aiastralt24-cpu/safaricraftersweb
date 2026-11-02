import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createLeadAttachmentDownloadAdapter,handleLeadAttachmentDownload,leadAttachmentDownloadConfig} from '../lib/cms/lead-attachment-download.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,bytes=Buffer.from('checked fixture'),file={site:id(1),lead:id(2),upload:id(3),request:id(4),key:`${id(1)}/enquiries/${id(4)}/${id(3)}/delivery.webp`,filename:'CV.png',mime:'image/webp',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},token='user.jwt.token';
const request=()=>new Request(`https://cms.test/api/cms/leads/attachment?lead=${file.lead}&upload=${file.upload}`,{headers:{authorization:`Bearer ${token}`}});
const adapter=patch=>({site:file.site,authorize:async()=>file,audit:async()=>file,read:async()=>new Response(bytes,{headers:{'content-type':file.mime}}),...patch});
test('private attachment download verifies bytes and permissions twice without a public URL',async()=>{
 let checks=0;const result=await handleLeadAttachmentDownload(request(),adapter({authorize:async value=>{assert.equal(value,token);checks++;return file;},audit:async value=>{assert.equal(value,token);checks++;return file;}}));assert.equal(result.status,200);assert.equal(checks,2);assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes);assert.match(result.headers.get('content-disposition'),/CV.webp/);assert.match(result.headers.get('cache-control'),/no-store/);
});
test('unauthorized, substituted, corrupt or revoked attachments never return file bytes',async()=>{
 assert.equal((await handleLeadAttachmentDownload(new Request(request().url),adapter({}))).status,401);
 for(const patch of [{authorize:async()=>null},{authorize:async()=>({...file,site:id(9)})},{authorize:async()=>({...file,key:'elsewhere'})},{read:async()=>new Response('wrong',{headers:{'content-type':file.mime}})},{read:async()=>new Response(Buffer.alloc(bytes.length),{headers:{'content-type':file.mime}})},{read:async()=>new Response(Buffer.alloc(bytes.length+1),{headers:{'content-type':file.mime}})},{read:async()=>new Response(bytes,{headers:{'content-type':'text/html'}})}]){const response=await handleLeadAttachmentDownload(request(),adapter(patch));assert.notEqual(response.status,200);assert.equal((await response.text()).includes('checked fixture'),false);}
 assert.notEqual((await handleLeadAttachmentDownload(request(),adapter({audit:async()=>null}))).status,200);
});
test('storage transport keeps user and service credentials separate and feature flag defaults off',async()=>{
 const calls=[],backend=createLeadAttachmentDownloadAdapter({url:'https://db.test',anonKey:'anon',serviceKey:'service',site:file.site},async(url,options)=>{calls.push({url:String(url),options});return Response.json(file);});
 await backend.authorize(token,file.lead,file.upload);await backend.read(file);await backend.audit(token,file);assert.equal(calls[0].options.headers.Authorization,`Bearer ${token}`);assert.equal(calls[1].options.headers.Authorization,'Bearer service');assert.match(calls[1].url,/\/cms-enquiry-files\//);assert.equal(calls[1].options.redirect,'error');assert.equal(calls[2].options.headers.Authorization,`Bearer ${token}`);assert.match(calls[2].url,/audit_lead_attachment_download$/);assert.equal(leadAttachmentDownloadConfig({}),null);
 await assert.rejects(()=>backend.read({...file,key:'../original'}));
});

test('audit refusal or persistence failure prevents release of verified bytes',async()=>{
 for(const audit of [async()=>null,async()=>{throw Error('audit storage unavailable');},async()=>({...file,sha256:'0'.repeat(64)})]){const response=await handleLeadAttachmentDownload(request(),adapter({audit}));assert.equal(response.status,503);assert.equal((await response.text()).includes('checked fixture'),false);}
 let audits=0;await handleLeadAttachmentDownload(request(),adapter({read:async()=>new Response('corrupt',{headers:{'content-type':file.mime}}),audit:async()=>{audits++;return file;}}));assert.equal(audits,0);
});
