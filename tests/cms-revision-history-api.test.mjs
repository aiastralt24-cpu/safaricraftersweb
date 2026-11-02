import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRevisionHistory} from '../lib/cms/revision-history-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003';
const entry={id,parentRevision:null,authorId:site,createdAt:'2026-10-22T00:00:00+00:00'};
const request=(suffix='',auth=true)=>new Request(`https://site.test/api/cms/history?site=${site}&record=${record}${suffix}`,{headers:auth?{Authorization:'Bearer a.b.c'}:{}});
test('history endpoint binds identity and cursor, requires login and bounds query inputs',async()=>{
 let args;const response=await handleRevisionHistory(request('&limit=1'),async(...values)=>{args=values;return {recordId:record,items:[entry],nextCursor:id};});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(args,['a.b.c','list_revision_history',{p_site:site,p_record:record,p_before:null,p_limit:1}]);
 assert.equal((await handleRevisionHistory(request(`&before=${id}`),async(...values)=>{assert.equal(values[2].p_before,id);return {recordId:record,items:[],nextCursor:null};})).status,200);
 for(const suffix of ['&limit=0','&limit=101','&limit=1.5','&limit=01','&before=bad','&private=true',`&record=${record}`])assert.equal((await handleRevisionHistory(request(suffix),async()=>assert.fail())).status,422);
 assert.equal((await handleRevisionHistory(request('',false),async()=>assert.fail())).status,401);
 assert.equal((await handleRevisionHistory(request(),async()=>null)).status,404);
});
test('history endpoint rejects mismatched, oversized, repeated and malformed upstream history',async()=>{
 for(const result of [{recordId:site,items:[],nextCursor:null},{recordId:record,items:[{...entry,payload:{private:true}}],nextCursor:null},{recordId:record,items:[entry,entry],nextCursor:null},{recordId:record,items:[],nextCursor:id},{recordId:record,items:[entry],nextCursor:site}])assert.equal((await handleRevisionHistory(request('&limit=1'),async()=>result)).status,503);
 assert.equal((await handleRevisionHistory(request(`&before=${id}`),async()=>({recordId:record,items:[entry],nextCursor:null}))).status,503);
});
