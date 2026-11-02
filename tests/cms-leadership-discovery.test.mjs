import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadLeadershipDiscovery,leadershipSearchItems,leadershipSitemapItems} from '../lib/cms/leadership-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/leadership/example',title:'Example',summary:'Searchable conservation outcome',role:'Director',department:'Board',status:'current',sortOrder:0,image:{assetId:'leadership',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('leadership discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(leadershipSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/leadership','https://safaricrafters.com/leadership/example']);const items=leadershipSearchItems([row]);assert.equal(items[0].type,'Leadership');assert.equal(filterSiteSearch(items,'conservation','Leadership').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(leadershipSitemapItems([value]),[]);assert.deepEqual(leadershipSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(leadershipSitemapItems([excluded]),[]);assert.equal(leadershipSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(leadershipSearchItems([row],defaults),[]);assert.deepEqual(leadershipSitemapItems([row],defaults),[]);assert.deepEqual(leadershipSitemapItems([]),[]);
});
test('disabled leadership discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadLeadershipDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadLeadershipDiscovery({CMS_LEADERSHIP_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadLeadershipDiscovery({CMS_LEADERSHIP_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});
