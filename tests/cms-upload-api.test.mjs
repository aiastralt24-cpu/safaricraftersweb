import test from 'node:test';
import assert from 'node:assert/strict';
import {handleUploadCommand} from '../lib/cms/upload-api.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const body={action:'reserve',site,requestKey:id,filename:'forest.jpg',mime:'image/jpeg',bytes:1024};
const request=(value,headers={})=>new Request('https://cms.test/api/cms/uploads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
test('reservation commands preserve user identity and never accept readiness or storage overrides',async()=>{
 let args;const result=await handleUploadCommand(request(body),async(...input)=>{args=input;return {id,status:'reserved'};});
 assert.equal(result.status,200);assert.equal(args[0],'a.b.c');assert.equal(args[1],'reserve_upload');assert.equal(args[2].p_request,id);assert.match(result.headers.get('cache-control'),/no-store/);
 for(const value of [{...body,status:'ready'},{...body,storageKey:'other/client'},{...body,action:'finish'},{...body,bytes:25000001}])assert.equal((await handleUploadCommand(request(value),async()=>{throw Error('should not run');})).status,422);
});
test('upload commands reject missing authorization, cross-origin writes and hidden uploads',async()=>{
 assert.equal((await handleUploadCommand(request(body,{Authorization:''}))).status,401);
 assert.equal((await handleUploadCommand(request(body,{Origin:'https://other.test'}))).status,403);
 assert.equal((await handleUploadCommand(request({action:'status',site,upload:id}),async()=>null)).status,404);
 let procedure;assert.equal((await handleUploadCommand(request({action:'cancel',site,upload:id}),async(_token,name)=>{procedure=name;return null;})).status,200);assert.equal(procedure,'cancel_upload');
});
test('recent upload list uses the caller identity and only the requested website',async()=>{
 let args;const response=await handleUploadCommand(request({action:'list',site}),async(...value)=>{args=value;return [];});assert.equal(response.status,200);assert.deepEqual(args,['a.b.c','list_uploads',{p_site:site}]);
});
