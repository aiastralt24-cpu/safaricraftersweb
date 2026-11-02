import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAccessRead} from '../lib/cms/access-api.ts';
import {CmsGatewayError} from '../lib/cms/gateway.ts';
const site='00000000-0000-4000-8000-000000000001',id='10000000-0000-4000-8000-000000000001';
const request=(query,auth=true)=>new Request(`https://cms.test/api/cms/access?${query}`,{headers:auth?{Authorization:'Bearer a.b.c'}:{}});
const member={userId:id,roleId:site,version:1,expiresAt:null,revokedAt:null,status:'active'};
test('access reads preserve caller identity, site scope, pagination and private caching',async()=>{
 for(const kind of ['members','roles']){
  const item=kind==='members'?{...member,email:'member@example.test'}:{id,name:'Editor',version:1,permissions:[{action:'edit',contentType:'journey',recordId:null}]};
  let received;const response=await handleAccessRead(request(`site=${site}&kind=${kind}&limit=1`),async(...args)=>{received=args;return [item];});
  assert.equal(response.status,200);assert.deepEqual(received,['a.b.c',`list_access_${kind}`,{p_site:site,p_after:null,p_limit:1}]);
  assert.deepEqual(await response.json(),{items:[item],nextCursor:id});assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('vary'),'Authorization');
 }
});
test('invalid queries and missing authentication never reach the database',async()=>{
 for(const suffix of ['&kind=roles','&limit=101','&limit=1e2','&limit=0','&actor=forged','&after=invalid']){
  let called=false;const response=await handleAccessRead(request(`site=${site}&kind=members${suffix}`),async()=>{called=true;return [];});assert.equal(response.status,400);assert.equal(called,false);
 }
 assert.equal((await handleAccessRead(request(`site=${site}&kind=members`,false))).status,401);
});
test('denied and malformed directory results cannot become successful partial lists',async()=>{
 const query=`site=${site}&kind=members`;
 assert.equal((await handleAccessRead(request(query),async()=>{throw new CmsGatewayError(403,'Access denied.');})).status,403);
 for(const rows of [null,[{...member,email:'member@example.test',providerMetadata:{}}],[member,member],[{...member,status:'unknown'}]])assert.equal((await handleAccessRead(request(query),async()=>rows)).status,503);
 assert.equal((await handleAccessRead(request(`${query}&after=${id}`),async()=>[member])).status,503);
 assert.deepEqual(await (await handleAccessRead(request(query),async()=>[])).json(),{items:[],nextCursor:null});
});

test('membership commands enforce strict fields and forward an optimistic version using caller identity',async()=>{
 const {handleAccessCommand}=await import('../lib/cms/access-api.ts');
 const body={site,userId:id,roleId:site,expectedVersion:1,expectedRoleVersion:1,expiresAt:null,revoked:false};
 const req=(value,origin='https://cms.test')=>new Request('https://cms.test/api/cms/access',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)});
 let received;const response=await handleAccessCommand(req(body),async(...args)=>{received=args;return {...member,version:2};});
 assert.equal(response.status,200);assert.deepEqual(received,['a.b.c','update_membership',{p_site:site,p_user:id,p_expected:1,p_role:site,p_expires:null,p_revoked:false,p_expected_role:1}]);
 assert.deepEqual(await response.json(),{member:{...member,version:2}});
 for(const invalid of [{...body,expectedVersion:0},{...body,expectedRoleVersion:undefined},{...body,expectedRoleVersion:0},{...body,actor:id},{...body,revoked:'true'},{...body,expiresAt:'tomorrow'}]){
  let called=false;assert.equal((await handleAccessCommand(req(invalid),async()=>{called=true;})).status,422);assert.equal(called,false);
 }
 assert.equal((await handleAccessCommand(req(body,'https://untrusted.test'),async()=>{throw Error('must not run');})).status,403);
 for(const invalid of [member,{...member,version:2,userId:site},{...member,version:2,revokedAt:'2026-10-22T00:00:00Z'}])assert.equal((await handleAccessCommand(req(body),async()=>invalid)).status,503);
 assert.equal((await handleAccessCommand(req(body),async()=>{throw new CmsGatewayError(409,'Reload membership.');})).status,409);
});

test('role commands distinguish creation from versioned updates and verify returned permissions',async()=>{
 const {handleRoleCommand}=await import('../lib/cms/access-api.ts');
 const permission={action:'view',contentType:'journey',recordId:null};
 const body={site,roleId:null,expectedVersion:null,name:'Agency',permissions:[permission]};
 const req=value=>new Request('https://cms.test/api/cms/access/roles',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(value)});
 let received;const result={id,name:'Agency',version:1,permissions:[permission]};
 const response=await handleRoleCommand(req(body),async(...args)=>{received=args;return result;});assert.equal(response.status,200);
 assert.deepEqual(received,['a.b.c','save_access_role',{p_site:site,p_role:null,p_expected:null,p_name:'Agency',p_permissions:[permission]}]);
 for(const invalid of [{...body,roleId:id},{...body,expectedVersion:1},{...body,actor:id},{...body,permissions:[{...permission,action:'execute'}]}]){
  let called=false;assert.equal((await handleRoleCommand(req(invalid),async()=>{called=true;})).status,422);assert.equal(called,false);
 }
 assert.equal((await handleRoleCommand(req({...body,roleId:id,expectedVersion:1}),async()=>({...result,version:2}))).status,200);
 for(const invalid of [{...result,version:2},{...result,name:'Different'},{...result,permissions:[]}])assert.equal((await handleRoleCommand(req(body),async()=>invalid)).status,503);
});
