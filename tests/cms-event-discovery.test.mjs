import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadEventDiscovery,eventSearchItems,eventSitemapItems} from '../lib/cms/event-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/events/example',title:'Example',summary:'Searchable conservation outcome',category:'Travel',status:'scheduled',attendance:'online',timing:{mode:'allDay',start:'2026-12-01',end:'2026-12-01'},image:{assetId:'event',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('event discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(eventSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/events','https://safaricrafters.com/events/example']);const items=eventSearchItems([row]);assert.equal(items[0].type,'Event');assert.equal(filterSiteSearch(items,'conservation','Event').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(eventSitemapItems([value]),[]);assert.deepEqual(eventSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(eventSitemapItems([excluded]),[]);assert.equal(eventSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(eventSearchItems([row],defaults),[]);assert.deepEqual(eventSitemapItems([row],defaults),[]);assert.deepEqual(eventSitemapItems([]),[]);
});
test('disabled event discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadEventDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadEventDiscovery({CMS_EVENTS_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadEventDiscovery({CMS_EVENTS_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});
