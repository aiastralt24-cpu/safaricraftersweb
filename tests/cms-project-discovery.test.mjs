import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadProjectDiscovery,projectSearchItems,projectSitemapItems} from '../lib/cms/project-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/projects/example',title:'Example',summary:'Searchable conservation outcome',industry:'Travel',kind:'caseStudy',image:{assetId:'project',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('project discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(projectSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/projects','https://safaricrafters.com/projects/example']);const items=projectSearchItems([row]);assert.equal(items[0].type,'Project');assert.equal(filterSiteSearch(items,'conservation','Project').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(projectSitemapItems([value]),[]);assert.deepEqual(projectSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(projectSitemapItems([excluded]),[]);assert.equal(projectSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(projectSearchItems([row],defaults),[]);assert.deepEqual(projectSitemapItems([row],defaults),[]);assert.deepEqual(projectSitemapItems([]),[]);
});
test('disabled project discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadProjectDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadProjectDiscovery({CMS_PROJECT_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadProjectDiscovery({CMS_PROJECT_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});
