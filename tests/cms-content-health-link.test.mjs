import test from 'node:test';import assert from 'node:assert/strict';
import {healthReportHref,parseHealthReportLink} from '../lib/cms/content-health-link.ts';
import {handleContentHealthRead} from '../lib/cms/content-health-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002';
test('health report links require exact valid site and record identifiers without duplicate or extra fields',()=>{
 const href=healthReportHref(site,record);assert.deepEqual(parseHealthReportLink(href.split('?')[1]),{site,record});assert.equal(parseHealthReportLink(''),null);
 for(const query of ['view=health',`view=health&site=${site}&record=invalid`,href.split('?')[1]+'&record='+record,href.split('?')[1]+'&redirect=https://example.com'])assert.throws(()=>parseHealthReportLink(query));
});
test('direct health API rejects substituted records and ambiguous cursor requests',async()=>{
 const req=extra=>new Request(`https://cms.test/api/cms/health?site=${site}&record=${record}${extra}`,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleContentHealthRead(req(''),async(token,name,args)=>{assert.equal(name,'get_content_health');assert.deepEqual(args,{p_site:site,p_record:record});return {websiteId:site,items:[],nextCursor:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleContentHealthRead(req('&after='+record),async()=>assert.fail())).status,422);
 const row={id:site,type:'page',title:'Other',locale:'en',revision:record,publishedRevision:null,reviewStatus:'draft',validationState:'not_checked',checkedAt:null,expiresAt:null,errors:0,warnings:0,canRequest:false};
 assert.equal((await handleContentHealthRead(req(''),async()=>({websiteId:site,items:[row],nextCursor:null}))).status,500);
});
