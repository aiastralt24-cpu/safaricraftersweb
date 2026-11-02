import test from 'node:test';
import assert from 'node:assert/strict';
import {handleReferenceCommand} from '../lib/cms/reference-api.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const request=(body,headers={})=>new Request('https://site.test/api/cms/references',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('reference list and resolution use user authority, bounded scope and private responses',async()=>{
 for(const [body,name,args]of [[{action:'list',site,type:'application',search:'Alpha'},'list_reference_candidates',{p_site:site,p_type:'application',p_search:'Alpha',p_after:null}],[{action:'resolve',site,type:'application',records:[id]},'resolve_editor_references',{p_site:site,p_type:'application',p_records:[id]}],[{action:'list',site,type:'project',search:'Alpha'},'list_reference_candidates',{p_site:site,p_type:'project',p_search:'Alpha',p_after:null}],[{action:'resolve',site,type:'leadership',records:[id]},'resolve_editor_references',{p_site:site,p_type:'leadership',p_records:[id]}],[{action:'list',site,type:'leadership',search:'Alpha'},'list_reference_candidates',{p_site:site,p_type:'leadership',p_search:'Alpha',p_after:null}],[{action:'resolve',site,type:'testimonial',records:[id]},'resolve_editor_references',{p_site:site,p_type:'testimonial',p_records:[id]}]]){
  let observed;const response=await handleReferenceCommand(request(body),async(...params)=>{observed=params;return [];});assert.equal(response.status,200);assert.deepEqual(observed,['a.b.c',name,args]);assert.match(response.headers.get('cache-control'),/no-store/);
 }
});
test('invalid or privileged reference requests never reach the database',async()=>{
 const base={action:'resolve',site,type:'project',records:[id]};
 for(const body of [{...base,records:[id,id]},{...base,records:Array(101).fill(id)},{...base,type:'settings'},{...base,payload:{}},{action:'list',site,type:'project',search:'x'.repeat(201)}])assert.equal((await handleReferenceCommand(request(body),async()=>assert.fail('unexpected RPC'))).status,422);
 assert.equal((await handleReferenceCommand(request(base,{Origin:'https://other.test'}),async()=>assert.fail('unexpected RPC'))).status,403);
 assert.equal((await handleReferenceCommand(request(base,{Authorization:''}),async()=>assert.fail('unexpected RPC'))).status,401);
});


test('reference usage binds the selected saved revision and uses caller authority',async()=>{
 const revision='00000000-0000-4000-8000-000000000003';let seen;
 const response=await handleReferenceCommand(request({action:'usage',site,record:id,revision}),async(...args)=>{seen=args;return {recordId:id,revisionId:revision,items:[],nextCursor:null};});
 assert.equal(response.status,200);assert.deepEqual(seen,['a.b.c','record_reference_usage',{p_site:site,p_record:id,p_revision:revision,p_after:null}]);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleReferenceCommand(request({action:'usage',site,record:id}),async()=>assert.fail())).status,422);
});
