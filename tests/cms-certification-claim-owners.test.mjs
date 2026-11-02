import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCertificationClaimOwners} from '../lib/cms/certification-claim-owners-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),record=id(2),revision=id(3),owner=id(4);
const request=(body,headers={})=>new Request('https://cms.test/api/cms/certifications/claim-owners',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
const result={websiteId:site,recordId:record,revisionId:revision,canAssign:true,owners:[{id:owner,email:'reviewer@example.test'}],claims:[{claimId:record,ownerId:null,version:0,eligible:false}]};
test('certification ownership is bound to its single record claim and exact assignment version',async()=>{
 for(const action of ['list','assign']){
  const body={action,site,record,revision,...(action==='assign'?{claim:record,owner,expected:0}:{})};
  const response=await handleCertificationClaimOwners(request(body),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,action==='list'?'get_certification_claim_owners':'assign_certification_claim_owner');assert.deepEqual(args,{p_site:site,p_record:record,p_revision:revision,...(action==='assign'?{p_claim:record,p_owner:owner,p_expected:0}:{})});return result;});
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 }
 const body={action:'assign',site,record,revision,claim:record,owner,expected:0};
 for(const patch of [{claim:id(9)},{expected:-1},{extra:true}])assert.equal((await handleCertificationClaimOwners(request({...body,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handleCertificationClaimOwners(request(body,{origin:'https://other.test'}),async()=>assert.fail())).status,403);
 assert.equal((await handleCertificationClaimOwners(request(body,{authorization:''}),async()=>assert.fail())).status,401);
});
test('ownership responses cannot substitute another claim or omit the certification claim',async()=>{
 for(const claims of [[],[{...result.claims[0],claimId:id(9)}]])assert.equal((await handleCertificationClaimOwners(request({action:'list',site,record,revision}),async()=>({...result,claims}))).status,503);
});
