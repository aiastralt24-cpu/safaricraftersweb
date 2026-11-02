import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistSitemapItems} from '../lib/cms/specialist-sitemap.ts';
import {projectSpecialistPage,specialistPageMetadata} from '../lib/cms/specialist-page.ts';
import {createSpecialistDirectorySection} from '../lib/cms/section-drafts.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const id='00000000-0000-4000-8000-000000000001',origin='https://example.test';
const make=(seo={},defaults={})=>({profiles:[],seoDefaults:{titleTemplate:'%s | Brand',description:'Meet the team',indexing:'index',...defaults},page:projectSpecialistPage({recordId:id,revisionId:id,type:'page',payload:{seo:{...newPageSeo(),...seo},composition:{schemaVersion:1,title:'Specialists',sections:[{id:'intro',kind:'text',controls:{label:'Intro',headingLevel:'h1'},data:{title:'Meet the team',body:[]}},createSpecialistDirectorySection('directory')]}}},{locale:'en',now:new Date('2026-10-22T12:00:00Z')})});
test('specialist sitemap uses canonical published identity without fabricated modification dates',()=>{
 assert.deepEqual(specialistSitemapItems(make(),origin),[{url:'https://example.test/specialists'}]);
 assert.deepEqual(specialistSitemapItems(make({canonical:'https://EXAMPLE.test:443/specialists',sitemap:'include'}),origin),[{url:'https://example.test/specialists'}]);
 assert.deepEqual(specialistSitemapItems(null,origin),[]);
 assert.throws(()=>specialistSitemapItems(make(),'http://example.test'));
});
test('specialist sitemap and rendered metadata agree on noindex and canonical overrides',()=>{
 for(const content of [make({indexing:'noindex',sitemap:'include'}),make({indexing:'index',sitemap:'include'},{indexing:'noindex'})]){
  assert.deepEqual(specialistSitemapItems(content,origin),[]);
  assert.equal(specialistPageMetadata(content.page,content.seoDefaults,origin).robots.index,false);
 }
 for(const canonical of ['https://elsewhere.test/original','https://example.test/about','https://example.test/specialists/']){
  const content=make({canonical,sitemap:'include'});assert.deepEqual(specialistSitemapItems(content,origin),[]);
  assert.equal(specialistPageMetadata(content.page,content.seoDefaults,origin).alternates.canonical,canonical);
 }
 assert.deepEqual(specialistSitemapItems(make({sitemap:'exclude'}),origin),[]);
});
