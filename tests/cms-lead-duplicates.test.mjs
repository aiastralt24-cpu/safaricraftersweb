import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedLeadDuplicates} from '../lib/cms/lead-duplicates.ts';
import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const site='00000000-0000-4000-8000-000000000001',lead='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003';
const result={websiteId:site,leadId:lead,hasEmail:true,items:[{id,status:'won',createdAt:'2026-01-01T00:00:00Z',version:2,reason:'matching_email'}],nextCursor:null};
const request=body=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('duplicate evidence binds site, source, ordering and bounded continuation without contact data',()=>{
 assert.deepEqual(verifiedLeadDuplicates(result,site,lead),result);
 for(const patch of [{websiteId:id},{leadId:id},{hasEmail:false},{nextCursor:id},{items:[{...result.items[0],id:lead}]},{items:[...result.items,...result.items]},{items:[{...result.items[0],email:'private@example.test'}]}])assert.throws(()=>verifiedLeadDuplicates({...result,...patch},site,lead));
 assert.throws(()=>verifiedLeadDuplicates(result,site,lead,id));
});
test('duplicate API is read-only, scoped, private and refuses malformed or hidden evidence',async()=>{
 let args;const response=await handleLeadCommand(request({action:'duplicates',site,lead}),async(...input)=>{args=input;return result;});assert.equal(response.status,200);assert.deepEqual(args,['a.b.c','list_lead_duplicates',{p_site:site,p_lead:lead,p_after:null,p_limit:20}]);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleLeadCommand(request({action:'duplicates',site,lead}),async()=>null)).status,404);
 assert.notEqual((await handleLeadCommand(request({action:'duplicates',site,lead}),async()=>({...result,leadId:id}))).status,200);
 assert.equal((await handleLeadCommand(request({action:'duplicates',site,lead,email:'override@test.com'}),async()=>assert.fail('unexpected call'))).status,422);
});
