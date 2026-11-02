import test from 'node:test';import assert from 'node:assert/strict';
import {readLocalizedPageSummaries,loadLocalizedPageDiscovery,localizedPageSitemapItems} from '../lib/cms/localized-page-discovery.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';import {newPageSeo} from '../lib/cms/page-seo.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(9999);
const row=n=>({recordId:id(n),revisionId:id(999),locale:'fr-CA',path:`/guide-${n}`,modifiedAt:'2026-10-28T00:00:00Z',title:'Guide',seo:null,seoDefaults:newGlobalSettings().seo});
const envelope=items=>({websiteId:site,items});
test('localized catalogue binds site and enforces bounded ordered pagination and unique visitor paths',async()=>{
 const cursors=[];const result=await readLocalizedPageSummaries(site,async after=>{cursors.push(after);return envelope(after?[row(101)]:Array.from({length:100},(_,i)=>row(i+1)));});assert.equal(result.length,101);assert.deepEqual(cursors,[null,id(100)]);
 for(const items of [[row(2),row(1)],[row(1),{...row(2),path:'/guide-1'}],[{...row(1),locale:'en'}],[{...row(1),path:'/cms'}],[{...row(1),privateTitle:'Draft'}]])await assert.rejects(()=>readLocalizedPageSummaries(site,async()=>envelope(items)));
 await assert.rejects(()=>readLocalizedPageSummaries(site,async()=>({websiteId:id(99),items:[]})),/website/);
 const shared=await readLocalizedPageSummaries(site,async()=>envelope([row(1),{...row(2),locale:'de',path:'/guide-1'}]));assert.equal(shared.length,2);
 await assert.rejects(()=>readLocalizedPageSummaries(site,async after=>{const start=after?Number(after.slice(-12)):0;return envelope(Array.from({length:100},(_,i)=>row(start+i+1)));}),/limit/);
});
test('localized sitemap respects each language indexing, explicit exclusion and canonical URL',async()=>{
 const data=[row(1),{...row(2),seo:{...newPageSeo(),indexing:'noindex'}},{...row(3),seo:{...newPageSeo(),sitemap:'exclude'}},{...row(4),seo:{...newPageSeo(),canonical:'https://other.test/guide'}},{...row(5),seoDefaults:{...newGlobalSettings().seo,indexing:'noindex'}},{...row(6),seo:{...newPageSeo(),canonical:'https://example.com/languages/fr-CA/guide-6'}}];
 const items=await readLocalizedPageSummaries(site,async()=>envelope(data));assert.deepEqual(localizedPageSitemapItems(items,'https://example.com').map(v=>v.url),['https://example.com/languages/fr-CA/guide-1','https://example.com/languages/fr-CA/guide-6']);assert.throws(()=>localizedPageSitemapItems(items,'http://example.com'));
});
test('localized catalogue stays offline while disabled and uses anonymous credentials only',async()=>{
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'};let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.match(String(url),/list_published_localized_pages$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_after:null,p_limit:100});return Response.json(envelope([row(1)]));};
 assert.deepEqual(await loadLocalizedPageDiscovery({},fetcher),[]);assert.equal(calls,0);assert.equal((await loadLocalizedPageDiscovery(env,fetcher)).length,1);await assert.rejects(()=>loadLocalizedPageDiscovery({...env,CMS_CUSTOM_PAGES_ENABLED:'false'},fetcher),/configured/);assert.equal(calls,1);
});
