import test from 'node:test';import assert from 'node:assert/strict';
import {handlePageUrlImpact} from '../lib/cms/page-url-impact-api.ts';import {parsePageUrlImpact} from '../lib/cms/page-url-impact.ts';
const [site,record,revision,source]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const command={site,record,revision,path:'/new-url',after:null};
const result={snapshot:'a'.repeat(32),recordId:record,revisionId:revision,currentPath:'/old-url',proposedPath:'/new-url',locale:'en',published:true,status:'eligible',redirectDecisionRequired:true,coverage:'visible_saved_local_links_and_record_references',items:[{recordId:source,title:'Source',type:'page',path:'/source',locale:'en',draftLink:true,publishedLink:false,draftReference:false,publishedReference:false}],nextCursor:null};
const req=(body,headers={})=>new Request('https://cms.test/api/cms/page-url-impact',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('URL impact review retains caller authority and binds path, record and revision',async()=>{
 let seen;const response=await handlePageUrlImpact(req(command),async(...args)=>{seen=args;return result;});assert.equal(response.status,200);assert.deepEqual(seen,['a.b.c','review_page_url',{p_site:site,p_record:record,p_revision:revision,p_path:'/new-url',p_after:null}]);assert.deepEqual((await response.json()).result,result);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('URL impact input validation prevents persistence calls for malformed or unauthorized requests',async()=>{
 for(const patch of [{path:''},{path:'x'.repeat(501)},{revision:'bad'},{after:'bad'},{apply:true}])assert.equal((await handlePageUrlImpact(req({...command,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handlePageUrlImpact(req(command,{Authorization:''}),async()=>assert.fail())).status,401);assert.equal((await handlePageUrlImpact(req(command,{Origin:'https://outside.test'}),async()=>assert.fail())).status,403);
});
test('impact response cannot substitute scope, understate redirect need or duplicate pagination',()=>{
 assert.deepEqual(parsePageUrlImpact(result,command),result);
 for(const patch of [{recordId:source},{revisionId:source},{proposedPath:'/other'},{redirectDecisionRequired:false},{coverage:'all_links'},{items:[...result.items,...result.items]},{nextCursor:source},{items:[{...result.items[0],draftLink:false}]}])assert.throws(()=>parsePageUrlImpact({...result,...patch},command));
 assert.throws(()=>parsePageUrlImpact(result,{...command,after:source}));
});
