import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadPartnerDiscovery,partnerSearchItems,partnerSitemapItems} from '../lib/cms/partner-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/partners/example',title:'Example',summary:'Searchable conservation outcome',kind:'servicePartner',image:null,modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('partner discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(partnerSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/partners','https://safaricrafters.com/partners/example']);const items=partnerSearchItems([row]);assert.equal(items[0].type,'Partner');assert.equal(filterSiteSearch(items,'conservation','Partner').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(partnerSitemapItems([value]),[]);assert.deepEqual(partnerSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(partnerSitemapItems([excluded]),[]);assert.equal(partnerSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(partnerSearchItems([row],defaults),[]);assert.deepEqual(partnerSitemapItems([row],defaults),[]);assert.deepEqual(partnerSitemapItems([]),[]);
});
test('disabled partner discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadPartnerDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadPartnerDiscovery({CMS_PARTNER_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadPartnerDiscovery({CMS_PARTNER_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select partners',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['partner']});
 assert.deepEqual(searchCategories(settings),['Partner']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['partner','partner']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(partnerSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
