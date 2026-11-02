import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedSiteRedirectExport} from '../lib/cms/site-redirect-export.ts';
import {handleSiteRedirectExport} from '../lib/cms/site-redirect-export-api.ts';
const site='00000000-0000-4000-8000-000000000001',recordId='00000000-0000-4000-8000-000000000002';
const row={recordId,locale:'en',sourcePath:'/old',destinationPath:'/new',destinationPublished:false,status:308,enabled:false,addressReserved:true,version:1};
const fixture={schemaVersion:1,kind:'cms-site-redirects',site,exportedAt:'2026-10-29T00:00:00Z',redirects:[row]};
test('site export preserves paused/unpublished state and rejects mixed sites, duplicates and malformed files',()=>{
 assert.deepEqual(verifiedSiteRedirectExport(fixture,site),fixture);
 for(const patch of [{site:recordId},{redirects:[row,row]},{redirects:[{...row,sourcePath:'/z'},row]},{redirects:[{...row,addressReserved:false}]},{redirects:[{...row,status:302}]},{redirects:[{...row,destinationPath:'https://evil.test'}]},{redirects:Array(10001).fill(row)},{privatePayload:{}}])assert.throws(()=>verifiedSiteRedirectExport({...fixture,...patch},site));
 assert.equal(verifiedSiteRedirectExport({...fixture,redirects:[row,{...row,locale:'fr'}]},site).redirects.length,2);
});
test('site export API requires authentication, validates commands and binds private response identity',async()=>{
 const request=(body={site},headers={},query='')=>new Request('https://cms.test/api/cms/redirects/export'+query,{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
 let calls=0;const call=async(token,name,args)=>{calls++;assert.equal(token,'a.b.c');assert.equal(name,'export_site_redirects');assert.deepEqual(args,{p_site:site});return fixture;};
 const result=await handleSiteRedirectExport(request(),call);assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);assert.deepEqual((await result.json()).result,fixture);
 for(const req of [request({site,extra:true}),request({site:'wrong'}),request({site},{origin:'https://evil.test'}),request({site},{},'?site='+site),request({site},{authorization:''})])assert.ok((await handleSiteRedirectExport(req,call)).status>=400);assert.equal(calls,1);
 assert.ok((await handleSiteRedirectExport(request(),async()=>({...fixture,site:recordId}))).status>=400);
});
