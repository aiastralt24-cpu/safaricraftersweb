import test from 'node:test';import assert from 'node:assert/strict';
import {handleDocumentUploadCommand} from '../lib/cms/document-upload-api.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',key='00000000-0000-4000-8000-000000000003';
const body={action:'reserve',site,requestKey:key,filename:'hero.pdf',mime:'application/pdf',bytes:15000000};
const request=(data=body,headers={})=>new Request('http://localhost/api/cms/document-uploads',{method:'POST',headers:{authorization:'Bearer caller.editor.token',origin:'http://localhost','content-type':'application/json',...headers},body:JSON.stringify(data)});
const reservation={id,status:'reserved',expiresAt:'2026-10-23T12:00:00Z',filename:'hero.pdf',expectedBytes:15000000};
const upload={...reservation,mime:'application/pdf',createdAt:'2026-10-23T11:30:00Z'};
test('document reservations use caller-scoped document RPC, bounded input and immutable request identity',async()=>{
 const seen=[];const response=await handleDocumentUploadCommand(request(),async(token,name,args)=>{seen.push({token,name,args});return reservation;},true);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{result:reservation});assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(seen,[{token:'caller.editor.token',name:'reserve_document_upload',args:{p_site:site,p_request:key,p_filename:'hero.pdf',p_mime:'application/pdf',p_bytes:15000000}}]);
});
test('disabled new uploads and invalid requests do not call the provider',async()=>{
 let calls=0;const call=async()=>{calls++;return reservation;};assert.equal((await handleDocumentUploadCommand(request(),call,false)).status,503);
 for(const patch of [{filename:'../hero.pdf'},{filename:'hero.mov'},{mime:'image/png'},{bytes:25000001},{bytes:0},{bytes:1.5},{action:'publish'},{unexpected:true}])assert.equal((await handleDocumentUploadCommand(request({...body,...patch}),call,true)).status,422);
 assert.equal((await handleDocumentUploadCommand(request(body,{origin:'https://foreign.example'}),call,true)).status,403);assert.equal((await handleDocumentUploadCommand(request(body,{authorization:''}),call,true)).status,401);assert.equal(calls,0);
});
test('status and cancel remain available while new uploads are disabled, but never act on image or foreign records',async()=>{
 const seen=[],call=async(_token,name)=>{seen.push(name);return name==='get_upload'?upload:null;};
 const status=await handleDocumentUploadCommand(request({action:'status',site,upload:id}),call,false);assert.equal(status.status,200);assert.equal((await status.json()).result.mime,'application/pdf');
 const cancelled=await handleDocumentUploadCommand(request({action:'cancel',site,upload:id}),call,false);assert.equal(cancelled.status,200);assert.deepEqual(seen,['get_upload','get_upload','cancel_upload']);
 for(const value of [null,{...upload,id:site},{...upload,mime:'image/png'}]){let mutations=0;const response=await handleDocumentUploadCommand(request({action:'cancel',site,upload:id}),async(_token,name)=>{if(name==='cancel_upload')mutations++;return value;},false);assert.equal(response.status,404);assert.equal(mutations,0);}
});
test('inconsistent reservation responses do not claim successful creation',async()=>{
 for(const value of [null,{...reservation,filename:'different.pdf'},{...reservation,expectedBytes:12},{...reservation,id:'bad'},{...reservation,privateToken:'secret'}])assert.equal((await handleDocumentUploadCommand(request(),async()=>value,true)).status,503);
});
test('document history remains available when uploads are off and rejects mixed, duplicate or oversized provider lists',async()=>{
 const response=await handleDocumentUploadCommand(request({action:'list',site}),async(token,name,args)=>{assert.equal(token,'caller.editor.token');assert.equal(name,'list_document_uploads');assert.deepEqual(args,{p_site:site});return [upload];},false);
 assert.deepEqual(await response.json(),{result:[upload],uploadsEnabled:false});
 for(const value of [[{...upload,mime:'image/png'}],[upload,upload],Array(51).fill(upload),null])assert.equal((await handleDocumentUploadCommand(request({action:'list',site}),async()=>value,true)).status,503);
});
