import test from 'node:test';import assert from 'node:assert/strict';
import {parseRedirectImport,verifiedRedirectImportReview} from '../lib/cms/redirect-import.ts';
import {handleRedirectImportReview} from '../lib/cms/redirect-import-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',row={sourcePath:'/old',destinationPath:'/new',locale:'en',enabled:true};
const file=(redirects=[row],patch={})=>JSON.stringify({schemaVersion:1,kind:'cms-redirect-import',site,redirects,...patch});
const rows=parseRedirectImport(file(),site),result={site,items:[{...rows[0],index:0,status:'new',reason:'eligible',target:record,published:false,snapshot:'a'.repeat(32)}]};
test('redirect import parses explicit templates and exported identities without trusting exported state versions',()=>{
 assert.deepEqual(rows,[{...row,recordId:null}]);assert.deepEqual(parseRedirectImport('\uFEFF'+file(),site),rows);
 const exported={schemaVersion:1,kind:'cms-site-redirects',site,exportedAt:'2026-10-29T00:00:00Z',redirects:[{...row,recordId:record,destinationPublished:false,status:308,addressReserved:true,version:9}]};assert.equal(parseRedirectImport(JSON.stringify(exported),site)[0].recordId,record);
 for(const invalid of ['{',' '.repeat(1000001),file([]),file(Array(101).fill(row)),file([row,row]),file([{...row,sourcePath:'/new'}]),file([{...row,destinationPath:'https://evil.test'}]),file([{...row,sourcePath:'/cms'}]),file([row],{site:record}),file([{...row,enabled:'true'}]),file([row],{unexpected:1})])assert.throws(()=>parseRedirectImport(invalid,site));
});
test('redirect review binds every input row and rejects contradictory or private blocked evidence',()=>{
 assert.deepEqual(verifiedRedirectImportReview(result,site,rows),result);
 for(const patch of [{index:1},{sourcePath:'/different'},{target:null},{published:null},{snapshot:null},{reason:'source_unavailable'},{status:'blocked'},{privateTitle:'hidden'}])assert.throws(()=>verifiedRedirectImportReview({...result,items:[{...result.items[0],...patch}]},site,rows));
 assert.throws(()=>verifiedRedirectImportReview({...result,site:record},site,rows));assert.throws(()=>verifiedRedirectImportReview({...result,items:[]},site,rows));
 const blocked={...result,items:[{...result.items[0],status:'blocked',reason:'source_unavailable',target:null,published:null,snapshot:null}]};assert.deepEqual(verifiedRedirectImportReview(blocked,site,rows),blocked);
});
test('redirect import API reparses original file, uses read-only review RPC and rejects invalid input before access',async()=>{
 const req=(body={site,file:file()},headers={},query='')=>new Request('https://cms.test/api/cms/redirects/import'+query,{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});let calls=0;
 const call=async(token,name,args)=>{calls++;assert.equal(token,'a.b.c');assert.equal(name,'review_redirect_import');assert.deepEqual(args,{p_site:site,p_items:rows});return result;};
 const response=await handleRedirectImportReview(req(),call);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const request of [req({site,file:file([row,row])}),req({site,file:file(),apply:true}),req(undefined,{authorization:''}),req(undefined,{origin:'https://evil.test'}),req(undefined,{},'?apply=true')])assert.ok((await handleRedirectImportReview(request,call)).status>=400);assert.equal(calls,1);
 assert.ok((await handleRedirectImportReview(req(),async()=>({...result,site:record}))).status>=400);
});

test('retarget files require explicit prior owner and preserve it through review verification',()=>{
 const retargetFrom={recordId:record,path:'/previous'},input=JSON.stringify({schemaVersion:1,kind:'cms-redirect-retarget',site,redirects:[{...row,retargetFrom}]}),parsed=parseRedirectImport(input,site);assert.deepEqual(parsed[0].retargetFrom,retargetFrom);
 assert.throws(()=>parseRedirectImport(file([{...row,retargetFrom}]),site));assert.throws(()=>parseRedirectImport(input.replace('"retargetFrom"','"unknown"'),site));
 const review={site,items:[{...parsed[0],index:0,status:'retarget',reason:'eligible',target:site,published:true,snapshot:'a'.repeat(32)}]};assert.equal(verifiedRedirectImportReview(review,site,parsed).items[0].status,'retarget');
 const reordered=structuredClone(parsed);reordered[0].retargetFrom={path:'/previous',recordId:record};assert.equal(verifiedRedirectImportReview(review,site,reordered).items[0].status,'retarget');
 assert.throws(()=>verifiedRedirectImportReview({...review,items:[{...review.items[0],retargetFrom:{...retargetFrom,path:'/wrong'}}]},site,parsed));assert.throws(()=>verifiedRedirectImportReview({...review,items:[{...review.items[0],status:'new'}]},site,parsed));
});
