import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadCertificationDiscovery,certificationSearchItems,certificationSitemapItems} from '../lib/cms/certification-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/certifications/example',title:'Example',summary:'Searchable conservation outcome',issuer:'Example issuer',modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('certification discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(certificationSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/certifications','https://safaricrafters.com/certifications/example']);const items=certificationSearchItems([row]);assert.equal(items[0].type,'Certification');assert.equal(filterSiteSearch(items,'conservation','Certification').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(certificationSitemapItems([value]),[]);assert.deepEqual(certificationSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(certificationSitemapItems([excluded]),[]);assert.equal(certificationSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(certificationSearchItems([row],defaults),[]);assert.deepEqual(certificationSitemapItems([row],defaults),[]);assert.deepEqual(certificationSitemapItems([]),[]);
});
test('disabled certification discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadCertificationDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadCertificationDiscovery({CMS_CERTIFICATION_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadCertificationDiscovery({CMS_CERTIFICATION_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select certifications',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['certification']});
 assert.deepEqual(searchCategories(settings),['Certification']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['certification','certification']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(certificationSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
