import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadProductCategoryDiscovery,productCategorySearchItems,productCategorySitemapItems} from '../lib/cms/product-category-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/product-categories/example',title:'Example',summary:'Searchable conservation outcome',parent:null,modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('product-category discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(productCategorySitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/product-categories','https://safaricrafters.com/product-categories/example']);const items=productCategorySearchItems([row]);assert.equal(items[0].type,'Product category');assert.equal(filterSiteSearch(items,'conservation','Product category').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(productCategorySitemapItems([value]),[]);assert.deepEqual(productCategorySearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(productCategorySitemapItems([excluded]),[]);assert.equal(productCategorySearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(productCategorySearchItems([row],defaults),[]);assert.deepEqual(productCategorySitemapItems([row],defaults),[]);assert.deepEqual(productCategorySitemapItems([]),[]);
});
test('disabled product-category discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadProductCategoryDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadProductCategoryDiscovery({CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadProductCategoryDiscovery({CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select product categories',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['productCategory']});
 assert.deepEqual(searchCategories(settings),['Product category']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['productCategory','productCategory']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(productCategorySitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
