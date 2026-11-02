import test from 'node:test';import assert from 'node:assert/strict';
import {collectPageRedirectExport} from '../lib/cms/page-redirect-export.ts';
import {handlePageRedirectManagement} from '../lib/cms/page-redirect-management-api.ts';
const [site,record]=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'],scope={site,record};
const items=Array.from({length:51},(_,i)=>({sourcePath:'/old-'+String(i).padStart(2,'0'),enabled:i!==0,version:i}));
const page=(part,nextCursor=null)=>({site,recordId:record,path:'/current',locale:'en',published:false,snapshot:'a'.repeat(32),items:part,nextCursor});
test('redirect export collects complete snapshot and preserves paused, reserved and unpublished semantics',async()=>{
 const calls=[];const result=await collectPageRedirectExport(scope,async(...args)=>{calls.push(args);return calls.length===1?page(items.slice(0,50),items[49].sourcePath):page(items.slice(50));});
 assert.deepEqual(calls,[[null,null],[items[49].sourcePath,'a'.repeat(32)]]);assert.equal(result.redirects.length,51);assert.equal(result.schemaVersion,1);assert.equal(result.kind,'cms-page-redirects');assert.equal(result.destinationPublished,false);assert.deepEqual(result.redirects[0],{sourcePath:'/old-00',destinationPath:'/current',status:308,enabled:false,addressReserved:true,version:0});
});
test('redirect export rejects changed snapshots, wrong destinations, mixed identities and interrupted downloads',async()=>{
 for(const patch of [{snapshot:'b'.repeat(32)},{path:'/changed'},{locale:'fr'},{published:true},{recordId:site},{items:[items[0]]}]){let n=0;await assert.rejects(()=>collectPageRedirectExport(scope,async()=>++n===1?page(items.slice(0,50),items[49].sourcePath):{...page(items.slice(50)),...patch}));}
 let n=0;await assert.rejects(()=>collectPageRedirectExport(scope,async()=>{if(++n===1)return page(items.slice(0,50),items[49].sourcePath);throw Error('provider unavailable');}),/provider unavailable/);
});
test('redirect export API uses the separately permissioned export RPC',async()=>{
 let call;const req=new Request('https://cms.test/api/cms/page-redirects',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'export',site,record})});const response=await handlePageRedirectManagement(req,async(...args)=>{call=args;return page([]);});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(call,['a.b.c','export_page_redirects',{p_site:site,p_record:record,p_after:null,p_snapshot:null}]);
});
