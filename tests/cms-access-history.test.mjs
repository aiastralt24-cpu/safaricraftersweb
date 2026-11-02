import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAccessHistory} from '../lib/cms/access-history.ts';
const site='00000000-0000-4000-8000-000000000001';
const entry={id:'9007199254740993',actorId:site,createdAt:'2026-10-22T10:00:00Z',action:'role.created',details:{roleId:site,before:null,after:{name:'Agency',version:1,permissions:[]}}};
const req=(extra='')=>new Request(`https://site.test/api/cms/access/history?site=${site}${extra}`,{headers:{Authorization:'Bearer a.b.c'}});
test('history preserves bigint cursors and forwards only the caller identity and fixed site query',async()=>{
 let received;const response=await handleAccessHistory(req('&limit=1'),async(...args)=>{received=args;return [entry];});assert.equal(response.status,200);assert.deepEqual(received,['a.b.c','list_access_history',{p_site:site,p_before:null,p_limit:1}]);assert.deepEqual(await response.json(),{items:[entry],nextCursor:entry.id});assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleAccessHistory(req('&before=9007199254740994'),async()=>[entry])).status,200);
});
test('history rejects duplicate inputs, oversized cursors, non-access events and unordered results',async()=>{
 for(const extra of ['&before=0','&before=9223372036854775808','&limit=101','&site='+site,'&email=private'])assert.equal((await handleAccessHistory(req(extra),async()=>{throw Error('must not call');})).status,400);
 for(const rows of [[entry,entry],[{...entry,action:'draft.saved'}],[{...entry,details:{...entry.details,privateData:'hidden'}}]])assert.equal((await handleAccessHistory(req(),async()=>rows)).status,503);
 assert.equal((await handleAccessHistory(req('&before='+entry.id),async()=>[entry])).status,503);
});
