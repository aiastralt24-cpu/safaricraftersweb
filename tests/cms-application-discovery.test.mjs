import test from 'node:test';import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';import {loadApplicationDiscovery,applicationSearchItems,applicationSitemapItems} from '../lib/cms/application-discovery.ts';import {filterSiteSearch} from '../lib/site-search.ts';
const row={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',path:'/applications/example',title:'Example',summary:'Searchable conservation outcome',kind:'application',image:{assetId:'application',alt:'Photo',decorative:false},modifiedAt:'2026-10-29T00:00:00Z',seo:newPageSeo()};
test('application discovery respects noindex, canonical and sitemap policy without losing search copy',()=>{
 assert.deepEqual(applicationSitemapItems([row]).map(r=>r.url),['https://safaricrafters.com/applications','https://safaricrafters.com/applications/example']);const items=applicationSearchItems([row]);assert.equal(items[0].type,'Application');assert.equal(filterSiteSearch(items,'conservation','Application').length,1);
 for(const seo of [{indexing:'noindex',sitemap:'include'},{canonical:'https://elsewhere.test/example'},{canonical:'https://safaricrafters.com/other'}]){const value={...row,seo:{...row.seo,...seo}};assert.deepEqual(applicationSitemapItems([value]),[]);assert.deepEqual(applicationSearchItems([value]),[]);}
 const excluded={...row,seo:{...row.seo,sitemap:'exclude'}};assert.deepEqual(applicationSitemapItems([excluded]),[]);assert.equal(applicationSearchItems([excluded]).length,1);
 const defaults={titleTemplate:'%s',description:'',indexing:'noindex'};assert.deepEqual(applicationSearchItems([row],defaults),[]);assert.deepEqual(applicationSitemapItems([row],defaults),[]);assert.deepEqual(applicationSitemapItems([]),[]);
});
test('disabled application discovery performs no network call; enabled failures are not empty success',async()=>{
 assert.equal(await loadApplicationDiscovery({},async()=>assert.fail('network')),null);assert.equal(await loadApplicationDiscovery({CMS_APPLICATION_DELIVERY_ENABLED:'true'},async()=>assert.fail('network')),null);
 await assert.rejects(()=>loadApplicationDiscovery({CMS_APPLICATION_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),/not configured/);
});

import {searchCategories} from '../lib/cms/search-policy.ts';
import {globalSettingsSchema} from '../lib/cms/global-settings.ts';
test('classified discovery lists both kinds and rejects duplicate identities',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_APPLICATION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:row.recordId,CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'fixture'};
 const industry={...row,recordId:'00000000-0000-4000-8000-000000000003',kind:'industry',path:'/industries/example'};
 const fetcher=async(url,init)=>Response.json(JSON.parse(init.body).p_kind==='industry'?[industry]:[row]);
 const rows=await loadApplicationDiscovery(env,fetcher);assert.equal(rows.length,2);
 assert.deepEqual(applicationSearchItems(rows).map(r=>r.detail),['Application','Industry']);
 assert.deepEqual(applicationSitemapItems(rows).map(r=>r.url),['https://safaricrafters.com/applications','https://safaricrafters.com/industries','https://safaricrafters.com/applications/example','https://safaricrafters.com/industries/example']);
 await assert.rejects(()=>loadApplicationDiscovery(env,async(url,init)=>Response.json(JSON.parse(init.body).p_kind==='industry'?[{...industry,recordId:row.recordId}]:[row])),/Duplicate/);
 await assert.rejects(()=>loadApplicationDiscovery(env,async()=>new Response('unavailable',{status:503})));
});
test('client search settings accept and select both classifications together',()=>{
 const settings=globalSettingsSchema.shape.search.parse({enabled:true,placeholder:'Search',emptyMessage:'Nothing found',contentTypes:['application']});
 assert.deepEqual(searchCategories(settings),['Application']);assert.deepEqual(searchCategories({...settings,enabled:false}),[]);
 assert.equal(globalSettingsSchema.shape.search.safeParse({...settings,contentTypes:['application','application']}).success,false);
 const restricted={titleTemplate:'%s',description:'',indexing:'noindex'};
 assert.deepEqual(applicationSitemapItems([{...row,seo:{...row.seo,indexing:'index'}}],restricted),[]);
});
