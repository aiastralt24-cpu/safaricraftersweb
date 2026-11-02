import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedContentActivity} from '../lib/cms/content-activity.ts';
import {handleContentActivity} from '../lib/cms/content-activity-api.ts';
const site='00000000-0000-4000-8000-000000000001';
const row=id=>({id,actorId:null,action:'draft.saved',record:site,revision:site,createdAt:'2026-10-28T00:00:00Z',title:'Page',type:'page',locale:'en'});
test('activity preserves bigint cursor precision, strict identity and descending pagination',()=>{
 const value={websiteId:site,available:true,items:[row('9007199254740993'),row('9007199254740992')],nextCursor:'9007199254740992'};assert.equal(verifiedContentActivity(value,site).items.length,2);
 for(const bad of [{...value,websiteId:'00000000-0000-4000-8000-000000000002'},{...value,available:false},{...value,items:[row('1'),row('2')]},{...value,nextCursor:'1'},{...value,items:[{...row('1'),details:{private:true}}]}])assert.throws(()=>verifiedContentActivity(bad,site));assert.throws(()=>verifiedContentActivity(value,site,'9007199254740993'));
});
test('activity API binds site cursor, uses user authorization and refuses ambiguous inputs',async()=>{
 const req=query=>new Request('https://cms.test/api/cms/activity?'+query,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleContentActivity(req('site='+site),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_content_activity');assert.deepEqual(args,{p_site:site,p_before:null,p_limit:20});return {websiteId:site,available:false,items:[],nextCursor:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const extra of ['&before=0','&before=9223372036854775808','&limit=100','&site='+site])assert.equal((await handleContentActivity(req('site='+site+extra),async()=>assert.fail())).status,422);
 assert.equal((await handleContentActivity(new Request('https://cms.test/api/cms/activity?site='+site),async()=>assert.fail())).status,401);
});
test('activity filtering distinguishes system actors and combines exact actor/action selections',async()=>{
 const {filterContentActivity}=await import('../lib/cms/content-activity.ts');const items=[row('3'),{...row('2'),actorId:site,actorLabel:'Editor',action:'review.approve'},{...row('1'),actorId:site}];
 assert.deepEqual(filterContentActivity(items,'system','').map(r=>r.id),['3']);assert.deepEqual(filterContentActivity(items,site,'draft.saved').map(r=>r.id),['1']);assert.equal(filterContentActivity(items,'','missing').length,0);assert.equal(filterContentActivity(items,'','').length,3);
});
