import test from 'node:test';import assert from 'node:assert/strict';
import {handlePageOrder} from '../lib/cms/page-order-api.ts';
import {parsePageOrder,parsePageOrderResult} from '../lib/cms/page-order.ts';
const [site,parent,id,revisionId,requestKey]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const scope={site,locale:'en',parent},state={site,locale:'en',parentId:parent,version:0,snapshot:'a'.repeat(32),items:[{id,title:'Page',path:'/page',revisionId,hierarchyVersion:1}]};
const command={action:'save',...scope,snapshot:state.snapshot,ids:[id],requestKey},result={site,locale:'en',parentId:parent,version:1,orderedIds:[id],requestKey};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/page-order',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('page order read and save use caller token and exact scoped fields',async()=>{
 for(const [body,name,args,response]of [[{action:'read',...scope},'get_page_sibling_order',{p_site:site,p_locale:'en',p_parent:parent},state],[command,'set_page_sibling_order',{p_site:site,p_locale:'en',p_parent:parent,p_snapshot:state.snapshot,p_ids:[id],p_request:requestKey},result]]){
  let seen;const reply=await handlePageOrder(request(body),async(...values)=>{seen=values;return response;});assert.equal(reply.status,200);assert.deepEqual(seen,['a.b.c',name,args]);assert.deepEqual((await reply.json()).result,response);assert.match(reply.headers.get('cache-control'),/no-store/);
 }
});
test('invalid ordering requests never reach persistence',async()=>{
 for(const patch of [{ids:[id,id]},{ids:Array(501).fill(id)},{snapshot:'invalid'},{parent:'bad'},{locale:'../en'},{requestKey:null},{version:1},{path:'/overwrite'}])assert.equal((await handlePageOrder(request({...command,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handlePageOrder(request(command,{Authorization:''}),async()=>assert.fail())).status,401);
 assert.equal((await handlePageOrder(request(command,{Origin:'https://elsewhere.test'}),async()=>assert.fail())).status,403);
});
test('branch and receipt parsing reject mixed scope, duplicates and mismatched order',()=>{
 assert.deepEqual(parsePageOrder(state,scope),state);assert.deepEqual(parsePageOrderResult(result,command),result);
 for(const patch of [{site:id},{locale:'fr'},{parentId:null},{items:[...state.items,...state.items]},{items:[{...state.items[0],id:parent}]}])assert.throws(()=>parsePageOrder({...state,...patch},scope));
 for(const patch of [{orderedIds:[]},{requestKey:id},{parentId:null},{version:0}])assert.throws(()=>parsePageOrderResult({...result,...patch},command));
});
test('untrusted database scope mismatches are not forwarded as successful saves',async()=>{
 const reply=await handlePageOrder(request(command),async()=>({...result,site:id}));assert.notEqual(reply.status,200);
});
