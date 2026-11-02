import test from 'node:test';import assert from 'node:assert/strict';
import {handleRecordOwnership} from '../lib/cms/record-ownership-api.ts';import {verifiedRecordOwnership} from '../lib/cms/record-ownership.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),record=id(2),owner=id(3);
const result={websiteId:site,recordId:record,ownerId:owner,ownerEmail:'owner@example.test',eligible:true,version:0,canAssign:true,owners:[{id:owner,email:'owner@example.test'}]};
const request=(body,origin)=>new Request('https://site.test/api/cms/ownership',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});
test('record ownership uses scoped server commands and verifies returned identity',async()=>{
 for(const action of ['read','assign']){const input={action,site,record,...(action==='assign'?{owner,expected:0}:{})};let called;const response=await handleRecordOwnership(request(input),async(...args)=>{called=args;return result;});assert.equal(response.status,200);assert.equal(called[1],action==='read'?'get_record_ownership':'assign_record_owner');assert.deepEqual(called[2],{p_site:site,p_record:record,...(action==='assign'?{p_owner:owner,p_expected:0}:{})});assert.deepEqual((await response.json()).result,result);assert.match(response.headers.get('cache-control'),/no-store/);}
 for(const patch of [{websiteId:id(7)},{recordId:id(7)},{owners:[...result.owners,...result.owners]},{canAssign:false},{eligible:false},{extra:'private'}])assert.throws(()=>verifiedRecordOwnership({...result,...patch},site,record));
});
test('record ownership rejects forged, cross-origin and incomplete assignments before dispatch',async()=>{
 const base={action:'assign',site,record,owner,expected:0};
 for(const patch of [{owner:null},{expected:-1},{expected:1.5},{actor:owner},{revision:id(7)},{expected:undefined}])assert.equal((await handleRecordOwnership(request({...base,...patch}),async()=>assert.fail('Unexpected dispatch'))).status,422);
 assert.equal((await handleRecordOwnership(request(base,'https://other.test'),async()=>assert.fail('Unexpected dispatch'))).status,403);
});
