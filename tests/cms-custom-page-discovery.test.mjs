import test from 'node:test';import assert from 'node:assert/strict';
import {readCustomPageSummaries,loadCustomPageDiscovery,customPageSitemapItems,customPageSearchItems} from '../lib/cms/custom-page-discovery.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';import {newPageSeo} from '../lib/cms/page-seo.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;const row=n=>({recordId:id(n),revisionId:id(999),path:`/guide-${n}`,modifiedAt:'2026-10-23T00:00:00Z',title:`Guide ${n}`,seo:null});
test('custom discovery validates pagination, ownership and public summary fields',async()=>{
 const cursors=[];const items=await readCustomPageSummaries(async after=>{cursors.push(after);return after?[row(101)]:Array.from({length:100},(_,i)=>row(i+1));});assert.equal(items.length,101);assert.deepEqual(cursors,[null,id(100)]);assert.deepEqual(items[0].seo,newPageSeo());
 for(const batch of [[row(2),row(1)],[row(1),{...row(2),path:'/guide-1'}],[{...row(1),path:'/admin/guide'}],[{...row(1),privateEvidence:'secret'}]])await assert.rejects(readCustomPageSummaries(async()=>batch));
});
test('custom sitemap honors effective noindex, exclusions and canonical ownership',async()=>{
 const items=await readCustomPageSummaries(async()=>[row(1),{...row(2),seo:{...newPageSeo(),indexing:'noindex'}},{...row(3),seo:{...newPageSeo(),sitemap:'exclude'}},{...row(4),seo:{...newPageSeo(),canonical:'https://other.test/guide'}}]);const defaults=newGlobalSettings().seo;
 assert.deepEqual(customPageSitemapItems(items,defaults,'https://safaricrafters.com').map(item=>item.url),['https://safaricrafters.com/guide-1']);assert.deepEqual(customPageSitemapItems(items,{...defaults,indexing:'noindex'},'https://safaricrafters.com'),[]);
});
test('disabled discovery does not fetch and enabled discovery requires published scoped defaults',async()=>{
 let calls=0;assert.equal(await loadCustomPageDiscovery({},async()=>{calls++;throw Error('unexpected')}),null);assert.equal(calls,0);
 const env={CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const fetcher=async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer anon');assert.equal(options.cache,'no-store');assert.equal(JSON.parse(options.body).p_site,id(1));return Response.json(new URL(url).pathname.endsWith('get_public_seo_settings')?{websiteId:id(1),recordId:id(2),revisionId:id(3),locale:'en',seo:newGlobalSettings().seo}:[row(1)]);};
 assert.equal((await loadCustomPageDiscovery(env,fetcher)).items.length,1);assert.equal(calls,2);await assert.rejects(loadCustomPageDiscovery(env,async()=>Response.json(null)),/SEO defaults/);
});

test('custom search excludes effective noindex but preserves pages excluded only from the sitemap',async()=>{
 const items=await readCustomPageSummaries(async()=>[row(1),{...row(2),seo:{...newPageSeo(),indexing:'noindex'}},{...row(3),seo:{...newPageSeo(),sitemap:'exclude',description:'Packing guidance'}}]);const defaults=newGlobalSettings().seo;
 const results=customPageSearchItems(items,defaults,'https://safaricrafters.com');assert.deepEqual(results.map(item=>item.href),['/guide-1','/guide-3']);assert.equal(results[1].detail,'Packing guidance');assert.equal(results[1].type,'Page');assert.deepEqual(customPageSearchItems(items,{...defaults,indexing:'noindex'},'https://safaricrafters.com'),[]);
});
