import test from 'node:test';
import assert from 'node:assert/strict';
import {handleUploadTransfer,putPrivateUpload} from '../lib/cms/upload-transfer.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const transfer={site,id,key:`${site}/${id}/original`,mime:'image/png',bytes:3};
const request=(bytes=new Uint8Array([1,2,3]),headers={})=>new Request('https://site.test/api/cms/uploads/transfer',{method:'POST',headers:{Authorization:'Bearer a.b.c','x-cms-site':site,'x-cms-upload':id,'Content-Type':'image/png',...headers},body:bytes});
test('file transfer authorizes first, enforces actual size and only reports awaiting verification',async()=>{
 const calls=[];const adapter={authorize:async(...args)=>{calls.push(args);return transfer;},put:async(...args)=>calls.push(args)};
 const response=await handleUploadTransfer(request(),adapter);assert.equal(response.status,202);assert.equal((await response.json()).result.status,'awaiting_verification');assert.equal(calls[0][0],'a.b.c');assert.equal(calls[1][0],'a.b.c');
 for(const [bytes,status]of [[new Uint8Array(4),413],[new Uint8Array(2),422]])assert.equal((await handleUploadTransfer(request(bytes),adapter)).status,status);
 assert.equal(calls.length,4); // rejected byte bodies never call storage
});
test('missing reservations, mismatched destinations and cross-origin transfers never write',async()=>{
 for(const [value,status]of [[null,404],[{...transfer,key:'other/path'},503]])assert.equal((await handleUploadTransfer(request(),{authorize:async()=>value,put:async()=>assert.fail()})).status,status);
 assert.equal((await handleUploadTransfer(request(undefined,{Origin:'https://other.test'}))).status,403);
});
test('storage transport uses the user token, private bucket and no-overwrite semantics',async()=>{
 let input;await putPrivateUpload({url:'https://cms.test',key:'public'},'user-token',transfer,new Uint8Array(3),async(...args)=>{input=args;return Response.json({Key:'ignored'});});
 assert.equal(input[0].pathname,`/storage/v1/object/cms-originals/${transfer.key}`);assert.equal(input[1].headers.Authorization,'Bearer user-token');assert.equal(input[1].headers['x-upsert'],'false');assert.equal(input[1].redirect,'error');
 await assert.rejects(putPrivateUpload({url:'https://cms.test',key:'public'},'user-token',transfer,new Uint8Array(3),async()=>Response.json({code:'Duplicate'},{status:400})),error=>error.status===409);
});
