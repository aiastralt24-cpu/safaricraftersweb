import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadLocationDiscovery,locationSearchItems,locationSitemapItems} from '../lib/cms/location-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/locations/example',title:'Example',summary:'Searchable conservation outcome',kind:'office',image:{assetId:'location',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('location discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(locationSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/locations','https://safaricrafters.com/locations/example']);const items=locationSearchItems([row]);assert.equal(items[0].type,'Location');assert.equal(filterSiteSearch(items,'conservation','Location').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(locationSitemapItems([value]),[]);assert.deepEqual(locationSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(locationSitemapItems([excluded]),[]);assert.equal(locationSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(locationSearchItems([row],defaults),[]);assert.deepEqual(locationSitemapItems([row],defaults),[]);assert.deepEqual(locationSitemapItems([]),[]);
});
test('disabled location discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadLocationDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadLocationDiscovery({CMS_LOCATION_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadLocationDiscovery({CMS_LOCATION_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select locations',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['location']});
 assert.deepEqual(searchCategories(settings),['Location']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['location','location']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(locationSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
