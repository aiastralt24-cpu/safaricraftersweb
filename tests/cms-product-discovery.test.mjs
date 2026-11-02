import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadProductDiscovery,productSearchItems,productSitemapItems} from '../lib/cms/product-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/products/example',title:'Example',summary:'Searchable conservation outcome',code:'000123',brand:'Example brand',image:null,lifecycle:'active',modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('product discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(productSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/products','https://safaricrafters.com/products/example']);const items=productSearchItems([row]);assert.equal(items[0].type,'Product');assert.equal(filterSiteSearch(items,'000123','Product').length,1);assert.equal(filterSiteSearch(items,'Example brand','Product').length,1);assert.equal(filterSiteSearch(items,'conservation','Product').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(productSitemapItems([value]),[]);assert.deepEqual(productSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(productSitemapItems([excluded]),[]);assert.equal(productSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(productSearchItems([row],defaults),[]);assert.deepEqual(productSitemapItems([row],defaults),[]);assert.deepEqual(productSitemapItems([]),[]);
});
test('disabled product discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadProductDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadProductDiscovery({CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadProductDiscovery({CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true',CMS_PRODUCT_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select products',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['product']});
 assert.deepEqual(searchCategories(settings),['Product']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['product','product']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(productSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
