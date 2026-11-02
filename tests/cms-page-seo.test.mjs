import test from 'node:test';
import assert from 'node:assert/strict';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from '../lib/cms/page-seo.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
test('page SEO accepts inherited defaults and rejects unsafe canonicals and arbitrary code',()=>{
 assert.ok(pageSeoSchema.safeParse(newPageSeo()).success);
 for(const canonical of ['javascript:alert(1)','//example.test/a','http://example.test/a','https://user:pass@example.test/a','https://example.test/a#part','https://example.test/ bad'])assert.equal(pageSeoSchema.safeParse({...newPageSeo(),canonical}).success,false);
 assert.ok(pageSeoSchema.safeParse({...newPageSeo(),canonical:'https://example.test/about'}).success);
 assert.equal(pageSeoSchema.safeParse({...newPageSeo(),jsonLd:'<script>'}).success,false);
 assert.equal(pageSeoSchema.safeParse({...newPageSeo(),title:'x'.repeat(201)}).success,false);
});
test('SEO findings flag deliberate indexing and sitemap conflicts without authorizing publication',()=>{
 const seo={...newPageSeo(),indexing:'noindex',sitemap:'include'};
 assert.deepEqual(pageSeoFindings(seo).map(f=>f.code),['page_noindex','sitemap_noindex']);
 const result=validateStoredContent({type:'page',path:'/concept',payload:{composition:{schemaVersion:1,title:'About',sections:[]},seo}});
 assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='page_noindex'));assert.ok(result.findings.some(f=>f.code==='concept_page_structure'));
});
test('page draft endpoint validates SEO before writes and preserves legacy absence',async()=>{
 const site='00000000-0000-4000-8000-000000000001';
 const base={action:'save',site,type:'page',record:null,expectedRevision:null,path:'/about',title:'About',payload:{}};
 const request=body=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
 for(const payload of [{},{seo:newPageSeo()}])assert.equal((await handleEditorCommand(request({...base,payload}),async()=>({recordId:site}))).status,200);
 for(const seo of [null,{}, {...newPageSeo(),canonical:'javascript:alert(1)'}])assert.equal((await handleEditorCommand(request({...base,payload:{seo}}),async()=>assert.fail('unexpected write'))).status,422);
});
