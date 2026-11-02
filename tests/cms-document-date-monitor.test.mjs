import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedDateMonitor} from '../lib/cms/document-date-monitor.ts';
import {handleDocumentDateMonitor} from '../lib/cms/document-date-monitor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,query={site:id(1),scope:'published',filter:'attention'};
const row={record:id(2),revision:id(3),title:'Certificate',locale:'en',expiresOn:'2026-10-29',reviewOn:'2026-10-28',expired:false,expiring:true,reviewOverdue:true,invalidDates:false,expiryPolicy:'warn'};
test('document date reports verify inclusive UTC expiry, scope, filters and malformed dates',()=>{
 const value={websiteId:id(1),scope:'published',filter:'attention',asOf:'2026-10-29',items:[row],nextCursor:null};assert.equal(verifiedDateMonitor(value,query).items[0].expired,false);
 for(const bad of [{...value,scope:'draft'},{...value,websiteId:id(9)},{...value,items:[{...row,expired:true}]},{...value,items:[{...row,expiresOn:'2026-02-30'}]},{...value,items:[row,row]},{...value,nextCursor:id(8)}])assert.throws(()=>verifiedDateMonitor(bad,query));
 assert.throws(()=>verifiedDateMonitor({...value,filter:'expired'},{...query,filter:'expired'}));
});
test('document date API uses private user scoped queries and rejects ambiguous filters',async()=>{
 const req=extra=>new Request(`https://cms.test/api/cms/documents/dates?site=${id(1)}${extra}`,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleDocumentDateMonitor(req(''),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_document_date_monitor');assert.deepEqual(args,{p_site:id(1),p_after:null,p_scope:'published',p_filter:'attention',p_limit:20});return {websiteId:id(1),scope:'published',filter:'attention',asOf:'2026-10-29',items:[row],nextCursor:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const extra of ['&scope=all','&filter=bad','&after=invalid','&scope=draft&scope=published','&limit=100'])assert.equal((await handleDocumentDateMonitor(req(extra),async()=>assert.fail())).status,422);
});
