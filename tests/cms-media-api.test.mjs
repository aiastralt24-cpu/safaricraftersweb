import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMediaCommand} from '../lib/cms/media-api.ts';
const site='00000000-0000-4000-8000-000000000001';
const edit={action:'edit',site,asset:'image',revision:1,title:'Forest',description:'',alt:'Forest canopy',caption:'',folder:'',tags:['forest']};
const request=(body,headers={})=>new Request('https://site.test/api/cms/media',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('metadata and rights map to separate fixed RPCs with expected revisions',async()=>{
 let call;assert.equal((await handleMediaCommand(request(edit),async(...args)=>{call=args;return 2;})).status,200);assert.equal(call[0],'a.b.c');assert.equal(call[1],'edit_media');assert.equal(call[2].p_expected,1);
 assert.equal((await handleMediaCommand(request({action:'rights',site,asset:'image',revision:2,status:'approved',evidence:'License',expires:null}),async(...args)=>{call=args;return 3;})).status,200);assert.equal(call[1],'set_media_rights');assert.equal(call[2].p_expected,2);
});
test('metadata writes cannot smuggle rights, storage locations or missing revisions',async()=>{
 for(const body of [{...edit,rights_status:'approved'},{...edit,storage_key:'replacement'},{...edit,revision:undefined},{...edit,tags:['x'.repeat(81)]}])assert.equal((await handleMediaCommand(request(body),async()=>assert.fail())).status,422);
 assert.equal((await handleMediaCommand(request(edit,{Origin:'https://other.test'}))).status,403);
 assert.equal((await handleMediaCommand(request({action:'get',site,asset:'image'}),async()=>null)).status,404);
});
test('usage and archive commands preserve scope and require an explicit revision',async()=>{
 let call;assert.equal((await handleMediaCommand(request({action:'usage',site,asset:'image'}),async(...args)=>{call=args;return [];})).status,200);assert.deepEqual(call,['a.b.c','media_usage',{p_site:site,p_asset:'image',p_after:null}]);
 assert.equal((await handleMediaCommand(request({action:'archive',site,asset:'image',revision:3,archived:true}),async(...args)=>{call=args;return 4;})).status,200);assert.equal(call[1],'archive_media');assert.equal(call[2].p_expected,3);assert.equal(call[2].p_archive,true);
 assert.equal((await handleMediaCommand(request({action:'archive',site,asset:'image',archived:true}))).status,422);
});
