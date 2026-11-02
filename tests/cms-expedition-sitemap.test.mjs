import test from 'node:test';
import assert from 'node:assert/strict';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {expeditionSitemapItems} from '../lib/cms/expedition-sitemap.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const card=(slug,seo={})=>({path:`/photo-expeditions/${slug}`,content:{...newPhotoExpedition(),slug,title:slug,seo:{...newPhotoExpedition().seo,...seo}}});
test('expedition sitemap contains only indexable canonical published cards without invented dates',()=>{
 const result=expeditionSitemapItems([card('forest'),card('excluded',{sitemap:'exclude'}),card('private',{indexing:'noindex',sitemap:'include'}),card('duplicate',{canonical:'https://other.test/original'}),card('explicit',{canonical:'https://site.test/photo-expeditions/explicit',sitemap:'include'})],'https://site.test');
 assert.deepEqual(result,[{url:'https://site.test/photo-expeditions/forest'},{url:'https://site.test/photo-expeditions/explicit'}]);assert.equal('lastModified' in result[0],false);
 assert.deepEqual(expeditionSitemapItems([card('forest',{indexing:'index',sitemap:'include'})],'https://site.test',{...newGlobalSettings().seo,indexing:'noindex'}),[]);
});
test('expedition sitemap rejects duplicate routes, mismatched slugs and unsafe origins',()=>{
 assert.throws(()=>expeditionSitemapItems([card('forest'),card('forest')],'https://site.test'));
 assert.throws(()=>expeditionSitemapItems([{...card('forest'),path:'/photo-expeditions/other'}],'https://site.test'));
 for(const origin of ['http://site.test','https://user:password@site.test','https://site.test/path'])assert.throws(()=>expeditionSitemapItems([card('forest')],origin));
 assert.deepEqual(expeditionSitemapItems([],'https://site.test'),[]);
});

test('atlas sitemap respects page and website exclusions independently from detail pages',async()=>{
 const {expeditionAtlasSitemapItems}=await import('../lib/cms/expedition-sitemap.ts');
 const {projectExpeditionPage}=await import('../lib/cms/expedition-page.ts');
 const {createExpeditionDirectorySection}=await import('../lib/cms/section-drafts.ts');
 const id='00000000-0000-4000-8000-000000000001';
 const source={recordId:id,revisionId:id,type:'page',payload:{composition:{schemaVersion:1,title:'Photography tours',sections:[{...createExpeditionDirectorySection('directory'),controls:{label:'Directory',headingLevel:'h1'}}]}}};
 const page=projectExpeditionPage(source,{locale:'en',now:new Date('2026-10-22T00:00:00Z')});
 const content={page,expeditions:[],today:'2026-10-22',seoDefaults:newGlobalSettings().seo};
 assert.deepEqual(expeditionAtlasSitemapItems(content,'https://site.test'),[{url:'https://site.test/photo-expeditions'}]);
 assert.deepEqual(expeditionAtlasSitemapItems(null,'https://site.test'),[]);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{sitemap:'exclude'},{canonical:'https://site.test/another-page'},{canonical:'https://other.test/photo-expeditions'}]){
  assert.deepEqual(expeditionAtlasSitemapItems({...content,page:{...page,seo:{...page.seo,...seo}}},'https://site.test'),[]);
 }
 assert.deepEqual(expeditionAtlasSitemapItems({...content,seoDefaults:{...content.seoDefaults,indexing:'noindex'},page:{...page,seo:{...page.seo,indexing:'index',sitemap:'include'}}},'https://site.test'),[]);
 assert.deepEqual(expeditionSitemapItems([card('forest')],'https://site.test'),[{url:'https://site.test/photo-expeditions/forest'}]);
 for(const origin of ['http://site.test','https://user:password@site.test','https://site.test/path'])assert.throws(()=>expeditionAtlasSitemapItems(content,origin));
});
