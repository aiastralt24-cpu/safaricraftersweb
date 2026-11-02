import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedContentHealth} from '../lib/cms/content-health.ts';import {handleContentHealthRead} from '../lib/cms/content-health-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
const row=n=>({id:id(n),type:'page',title:'Draft',locale:'en',revision:id(9),publishedRevision:null,reviewStatus:'draft',validationState:'not_checked',checkedAt:null,expiresAt:null,errors:0,warnings:0,canRequest:true});
test('content health binds website ordered records and visible continuation cursor',()=>{
 assert.equal(verifiedContentHealth({websiteId:site,items:[row(2)],nextCursor:id(2)},site).items.length,1);
 for(const result of [{websiteId:id(8),items:[],nextCursor:null},{websiteId:site,items:[row(3),row(2)],nextCursor:null},{websiteId:site,items:[row(2)],nextCursor:id(3)},{websiteId:site,items:[{...row(2),hiddenCount:10}],nextCursor:null}])assert.throws(()=>verifiedContentHealth(result,site));
 assert.throws(()=>verifiedContentHealth({websiteId:site,items:[row(2)],nextCursor:null},site,id(2)));
});
test('content health API retains user authorization and private caching, rejecting ambiguous queries and substituted responses',async()=>{
 const request=query=>new Request('https://cms.test/api/cms/health?'+query,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleContentHealthRead(request(`site=${site}`),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_content_health');assert.deepEqual(args,{p_site:site,p_after:null,p_limit:50});return {websiteId:site,items:[row(2)],nextCursor:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const query of [`site=${site}&site=${id(8)}`,`site=${site}&limit=500`,`site=${site}&after=invalid`])assert.equal((await handleContentHealthRead(request(query),async()=>assert.fail('unexpected RPC'))).status,422);
 assert.equal((await handleContentHealthRead(new Request('https://cms.test/api/cms/health?site='+site),async()=>assert.fail('unexpected RPC'))).status,401);
 assert.equal((await handleContentHealthRead(request(`site=${site}`),async()=>({websiteId:id(8),items:[],nextCursor:null}))).status,500);
});
test('health checks age into stale state without requiring a network refresh',async()=>{
 const {effectiveValidationState}=await import('../lib/cms/content-health.ts'),now=Date.parse('2026-10-28T10:00:00Z'),value={...row(2),validationState:'passed',expiresAt:'2026-10-28T10:00:01Z'};assert.equal(effectiveValidationState(value,now),'passed');assert.equal(effectiveValidationState(value,now+1000),'stale');assert.equal(effectiveValidationState({...value,validationState:'stale'},now),'stale');assert.equal(effectiveValidationState({...value,expiresAt:null},now),'stale');assert.equal(effectiveValidationState(row(2),now),'not_checked');
});
