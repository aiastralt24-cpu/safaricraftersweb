import test from 'node:test';import assert from 'node:assert/strict';
import {handleMfaPolicy} from '../lib/cms/mfa-policy-api.ts';
const site='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const policy={websiteId:site,required:true,version:2,verified:true,canManage:true};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/mfa-policy',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',Origin:'https://cms.test',...headers},body:JSON.stringify(body)});
test('MFA policy API uses caller token, exact site/version and validates the authoritative result',async()=>{
 let args;let result=await handleMfaPolicy(request({action:'read',site}),async(...value)=>{args=value;return policy;});assert.equal(result.status,200);assert.deepEqual(args,['a.b.c','get_mfa_policy',{p_site:site}]);assert.match(result.headers.get('cache-control'),/no-store/);
 result=await handleMfaPolicy(request({action:'set',site,version:1,required:true}),async(...value)=>{args=value;return policy;});assert.equal(result.status,200);assert.deepEqual(args,['a.b.c','set_mfa_policy',{p_site:site,p_version:1,p_required:true}]);
});
test('unauthenticated, cross-origin and injected MFA policy commands never reach storage',async()=>{
 let calls=0;const call=async()=>{calls++;return policy;};
 for(const [body,headers] of [[{action:'read',site},{Authorization:''}],[{action:'read',site},{Origin:'https://evil.test'}],[{action:'set',site,version:1,required:true,verified:true},{}],[{action:'set',site,version:-1,required:true},{}]])assert.notEqual((await handleMfaPolicy(request(body,headers),call)).status,200);
 assert.equal(calls,0);
});
test('wrong-site, malformed, unverified or contradictory policy saves are never reported as successful',async()=>{
 for(const patch of [{websiteId:other},{extra:'private'},{version:1},{required:false},{verified:false},{canManage:false}]){
  const response=await handleMfaPolicy(request({action:'set',site,version:1,required:true}),async()=>({...policy,...patch}));assert.equal(response.status,503);assert.equal((await response.text()).includes('private'),false);
 }
});
