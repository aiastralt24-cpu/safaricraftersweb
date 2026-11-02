import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedLeadAttention} from '../lib/cms/lead-attention.ts';import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row={id:id(2),status:'new',priority:'normal',version:1,createdAt:'2026-10-01T00:00:00Z',nextFollowUp:'2026-10-28T00:00:00Z',unassigned:true,overdue:true};
const value={websiteId:id(1),filter:'attention',asOf:'2026-10-29T00:00:00Z',items:[row],nextCursor:null};
test('lead attention verifies scope filters timing and excludes private fields',()=>{
 assert.equal(verifiedLeadAttention(value,id(1),'attention').items.length,1);
 for(const bad of [{...value,websiteId:id(8)},{...value,filter:'overdue'},{...value,items:[{...row,overdue:false}]},{...value,items:[{...row,status:'won'}]},{...value,items:[{...row,answers:{private:true}}]},{...value,items:[row,row]}])assert.throws(()=>verifiedLeadAttention(bad,id(1),'attention'));
});
test('lead attention command forwards user identity and direct enquiry reads reject substitutions',async()=>{
 const req=body=>new Request('https://cms.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await handleLeadCommand(req({action:'attention',site:id(1)}),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_lead_attention');assert.deepEqual(args,{p_site:id(1),p_after:null,p_filter:'attention',p_limit:20});return value;});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleLeadCommand(req({action:'attention',site:id(1),filter:'bad'}),async()=>assert.fail())).status,422);
 assert.equal((await handleLeadCommand(req({action:'get',site:id(1),lead:id(2)}),async()=>({id:id(3)}))).status,503);
});
