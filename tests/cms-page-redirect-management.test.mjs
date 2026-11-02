import test from 'node:test';import assert from 'node:assert/strict';
import {handlePageRedirectManagement} from '../lib/cms/page-redirect-management-api.ts';
import {parseRedirectList,parseRedirectChange} from '../lib/cms/page-redirect-management.ts';
const [site,record,key]=Array.from({length:3},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const scope={site,record,after:null,snapshot:null},listing={site,recordId:record,path:'/current',locale:'en',published:true,snapshot:'a'.repeat(32),items:[{sourcePath:'/old',enabled:true,version:0}],nextCursor:null};
const change={site,record,sourcePath:'/old',enabled:false,version:0,requestKey:key},receipt={site,recordId:record,sourcePath:'/old',enabled:false,version:1,requestKey:key};
const request=(body,headers={})=>new Request('https://cms.test/api/cms/page-redirects',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('redirect management forwards authenticated scope and exact change identity',async()=>{
 let call;assert.equal((await handlePageRedirectManagement(request({action:'list',site,record}),async(...args)=>{call=args;return listing;})).status,200);assert.deepEqual(call,['a.b.c','list_page_redirects',{p_site:site,p_record:record,p_after:null,p_snapshot:null}]);
 const response=await handlePageRedirectManagement(request({action:'set_enabled',...change}),async(...args)=>{call=args;return receipt;});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(call,['a.b.c','set_page_redirect_enabled',{p_site:site,p_record:record,p_source:'/old',p_version:0,p_enabled:false,p_request:key}]);
 for(const patch of [{version:-1},{enabled:'false'},{sourcePath:'/api/private'},{requestKey:null},{extra:true}])assert.equal((await handlePageRedirectManagement(request({action:'set_enabled',...change,...patch}),async()=>assert.fail())).status,422);
 assert.equal((await handlePageRedirectManagement(request({action:'list',site,record},{Origin:'https://outside.test'}),async()=>assert.fail())).status,403);
});
test('redirect lists and receipts reject mixed scope, changed pagination, unsafe paths and wrong decisions',()=>{
 assert.deepEqual(parseRedirectList(listing,scope),listing);assert.deepEqual(parseRedirectChange(receipt,change),receipt);
 for(const patch of [{site:record},{recordId:site},{items:[listing.items[0],listing.items[0]]},{nextCursor:'/old'},{items:[{sourcePath:'https://outside.test',enabled:true,version:0}]}])assert.throws(()=>parseRedirectList({...listing,...patch},scope));
 assert.throws(()=>parseRedirectList(listing,{...scope,after:'/before',snapshot:'b'.repeat(32)}));
 for(const patch of [{version:0},{enabled:true},{sourcePath:'/other'},{requestKey:site},{recordId:site}])assert.throws(()=>parseRedirectChange({...receipt,...patch},change));
});
test('saved redirect changes bind tab recovery to account, site, page and exact request',async()=>{
 const {parseSavedRedirectChange,redirectChangeStorageKey}=await import('../lib/cms/page-redirect-management.ts'),scope={actor:key,site,record},pending={...change,actor:key};
 assert.deepEqual(parseSavedRedirectChange(JSON.stringify(pending),scope),pending);assert.match(redirectChangeStorageKey(scope),/^cms-redirect-change:/);
 for(const patch of [{actor:site},{site:record},{record:site},{version:-1},{sourcePath:'//outside.test'},{requestKey:'bad'},{enabled:1},{extra:true}])assert.throws(()=>parseSavedRedirectChange(JSON.stringify({...pending,...patch}),scope));
 assert.throws(()=>parseSavedRedirectChange('x'.repeat(8001),scope));
});
