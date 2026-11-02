import test from 'node:test';import assert from 'node:assert/strict';
import {handlePageHierarchy} from '../lib/cms/page-hierarchy-api.ts';
const [site,record,revision,parent,requestKey]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const request=(body,headers={})=>new Request('https://site.test/api/cms/page-hierarchy',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('page hierarchy commands retain caller authority and exact move identity',async()=>{
 for(const [body,name,args]of [[{action:'tree',site,locale:'en',parent},'list_ordered_page_tree',{p_site:site,p_locale:'en',p_parent:parent,p_after:null,p_snapshot:null}],[{action:'cancel',site,record,revision,parent,version:0,requestKey},'cancel_page_move',{p_site:site,p_record:record,p_revision:revision,p_parent:parent,p_version:0,p_request:requestKey}],[{action:'parents',site,record},'list_page_parents',{p_site:site,p_record:record,p_after:null}],[{action:'read',site,record},'get_page_hierarchy',{p_site:site,p_record:record}],[{action:'move',site,record,revision,parent,version:0,requestKey},'move_page',{p_site:site,p_record:record,p_revision:revision,p_parent:parent,p_version:0,p_request:requestKey}]]){
  let seen;const response=await handlePageHierarchy(request(body),async(...args)=>{seen=args;return {};});assert.equal(response.status,200);assert.deepEqual(seen,['a.b.c',name,args]);assert.match(response.headers.get('cache-control'),/no-store/);
 }
});
test('invalid, cross-origin and unauthenticated moves never reach the database',async()=>{
 const base={action:'move',site,record,revision,parent,version:0,requestKey};
 for(const patch of [{version:-1},{version:1.2},{requestKey:undefined},{parent:'invalid'},{path:'/new-path'}])assert.equal((await handlePageHierarchy(request({...base,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handlePageHierarchy(request(base,{Origin:'https://foreign.test'}),async()=>assert.fail())).status,403);
 assert.equal((await handlePageHierarchy(request(base,{Authorization:''}),async()=>assert.fail())).status,401);
});
