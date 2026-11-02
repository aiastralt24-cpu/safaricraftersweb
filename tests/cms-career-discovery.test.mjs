import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadCareerDiscovery,careerSearchItems,careerSitemapItems} from '../lib/cms/career-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/careers/example',title:'Example',summary:'Searchable conservation outcome',employment:'fullTime',status:'open',opensAt:'',closesAt:'',image:{assetId:'career',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('career discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(careerSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/careers','https://safaricrafters.com/careers/example']);const items=careerSearchItems([row]);assert.equal(items[0].type,'Career');assert.equal(filterSiteSearch(items,'conservation','Career').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(careerSitemapItems([value]),[]);assert.deepEqual(careerSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(careerSitemapItems([excluded]),[]);assert.equal(careerSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(careerSearchItems([row],defaults),[]);assert.deepEqual(careerSitemapItems([row],defaults),[]);assert.deepEqual(careerSitemapItems([]),[]);
});
test('disabled career discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadCareerDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadCareerDiscovery({CMS_CAREER_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadCareerDiscovery({CMS_CAREER_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('client search settings accept and select careers',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['career']});
 assert.deepEqual(searchCategories(settings),['Career']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['career','career']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(careerSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
