import test from 'node:test';import assert from 'node:assert/strict';
import {handleProjectClaimOwners} from '../lib/cms/project-claim-owners-api.ts';
import {verifiedProjectClaimOwners} from '../lib/cms/project-claim-owners.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),record=id(2),revision=id(3),claim=id(4),owner=id(5);
const result={websiteId:site,recordId:record,revisionId:revision,canAssign:true,owners:[{id:owner,email:'reviewer@example.test'}],claims:[{claimId:claim,ownerId:null,version:0,eligible:false}]};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/projects/claim-owners',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('claim owner requests validate identity and dispatch only narrow RPCs',async()=>{
 for(const action of ['list','assign']){const response=await handleProjectClaimOwners(request({action,site,record,revision,...(action==='assign'?{claim,owner,expected:0}:{})}),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,action==='list'?'get_project_claim_owners':'assign_project_claim_owner');assert.deepEqual(args,{p_site:site,p_record:record,p_revision:revision,...(action==='assign'?{p_claim:claim,p_owner:owner,p_expected:0}:{})});return result;});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');}
 const call=()=>assert.fail('Unexpected RPC');assert.equal((await handleProjectClaimOwners(request({action:'list',site,record,revision},{Origin:'https://evil.test'}),call)).status,403);
 for(const patch of [{owner},{record:'bad'},{action:'approve'},{revision:null}])assert.equal((await handleProjectClaimOwners(request({action:'list',site,record,revision,...patch}),call)).status,422);
});
test('claim owner responses reject stale scopes, duplicates and impossible eligibility',()=>{
 assert.deepEqual(verifiedProjectClaimOwners(result,site,record,revision),result);
 for(const patch of [{revisionId:id(99)},{owners:[...result.owners,...result.owners]},{claims:[...result.claims,...result.claims]},{claims:[{...result.claims[0],eligible:true}]}])assert.throws(()=>verifiedProjectClaimOwners({...result,...patch},site,record,revision));
});
