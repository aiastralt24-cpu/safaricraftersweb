import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePreviewManagement} from '../lib/cms/preview-management-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002';
const request=(body,headers={})=>new Request('https://site.test/api/cms/previews',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('preview management scopes private reads to authenticated site and record',async()=>{
 for(const action of ['recipients','sessions']){
  let observed;const result=await handlePreviewManagement(request({action,site,record}),async(...args)=>{observed=args;return [];});
  assert.equal(result.status,200);assert.equal(observed[0],'a.b.c');assert.equal(observed[1],action==='recipients'?'list_preview_recipients':'list_my_previews');assert.equal(observed[2].p_record,record);assert.equal(observed[2].p_site,site);assert.match(result.headers.get('cache-control'),/no-store/);
 }
});
test('preview management rejects cross-origin, anonymous and malformed reads',async()=>{
 const body={action:'recipients',site,record},never=async()=>assert.fail('unexpected RPC');
 assert.equal((await handlePreviewManagement(request(body,{Origin:'https://other.test'}),never)).status,403);
 assert.equal((await handlePreviewManagement(request(body,{Authorization:''}),never)).status,401);
 for(const invalid of [{...body,search:'x'.repeat(201)},{...body,recipient:record},{...body,after:'bad'}])assert.equal((await handlePreviewManagement(request(invalid),never)).status,422);
});
