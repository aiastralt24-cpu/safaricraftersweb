import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadNewsDiscovery,newsSearchItems,newsSitemapItems} from '../lib/cms/news-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/news/example',title:'Example',summary:'Searchable conservation outcome',topic:'Travel',kind:'pressRelease',date:'2026-10-29',image:{assetId:'news',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('news discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(newsSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/news','https://safaricrafters.com/news/example']);const items=newsSearchItems([row]);assert.equal(items[0].type,'News');assert.equal(filterSiteSearch(items,'conservation','News').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(newsSitemapItems([value]),[]);assert.deepEqual(newsSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(newsSitemapItems([excluded]),[]);assert.equal(newsSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(newsSearchItems([row],defaults),[]);assert.deepEqual(newsSitemapItems([row],defaults),[]);assert.deepEqual(newsSitemapItems([]),[]);
});
test('disabled news discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadNewsDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadNewsDiscovery({CMS_NEWS_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadNewsDiscovery({CMS_NEWS_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});
