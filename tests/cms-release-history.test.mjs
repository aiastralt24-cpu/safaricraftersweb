import test from 'node:test';import assert from 'node:assert/strict';import {handleReleaseHistoryRead} from '../lib/cms/release-history-api.ts';
const id='00000000-0000-4000-8000-000000000001',row={release:id,request:id,createdAt:'2026-10-23T00:00:00Z',status:'committed',recordCount:2};
const req=(query=`site=${id}`,headers={Authorization:'Bearer a.b.c'})=>new Request(`https://site.test/api/cms/releases/history?${query}`,{headers});
test('history uses caller scope, bounded page size and safe response',async()=>{
 let call;const response=await handleReleaseHistoryRead(req(),async(...args)=>{call=args;return [row];});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','list_release_history',{p_site:id,p_before:null,p_limit:20}]);assert.deepEqual(await response.json(),{site:id,releases:[row],nextCursor:null});assert.match(response.headers.get('cache-control'),/no-store/);
});
test('history rejects anonymous, duplicate/extra filters and malformed private responses',async()=>{
 for(const request of [req('',{}),req(`site=${id}&site=${id}`),req(`site=${id}&actor=${id}`)]){let calls=0;const response=await handleReleaseHistoryRead(request,async()=>{calls++;return [];});assert.ok([400,401].includes(response.status));assert.equal(calls,0);}
 for(const rows of [[row,row],[{...row,actor:'SECRET'}],[{...row,recordCount:0}],null])assert.equal((await handleReleaseHistoryRead(req(),async()=>rows)).status,503);
});
