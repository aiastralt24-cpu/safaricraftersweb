import test from 'node:test';import assert from 'node:assert/strict';
import {usesCmsConservation,loadConservationRoute} from '../lib/cms/conservation-page-runtime.ts';
import {planConservationMigration,conservationMigrationDependencies} from '../lib/cms/conservation-migration.ts';
const id='00000000-0000-4000-8000-000000000001',now=new Date('2026-10-23T00:00:00Z');
const env={CMS_CONSERVATION_PAGE_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'public-test-key'};
const page=()=>({recordId:id,revisionId:id,type:'page',payload:planConservationMigration(conservationMigrationDependencies).previewPayload});
const settings=()=>({websiteId:id,recordId:id,revisionId:id,locale:'en',seo:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}});
function transport(content=page(),seo=settings()){
 const calls=[];const fetcher=async(url,options)=>{calls.push({url:String(url),options,body:JSON.parse(options.body)});return Response.json(String(url).endsWith('/get_public_page')?content:seo);};return {calls,fetcher};
}
test('conservation runtime requires explicit rollout and valid configuration before any network read',async()=>{
 assert.equal(usesCmsConservation({}),false);for(const flag of ['false','TRUE','1',''])assert.equal(usesCmsConservation({CMS_CONSERVATION_PAGE_ENABLED:flag}),false);
 assert.equal(usesCmsConservation(env),true);
 for(const key of Object.keys(env)){const config={...env};delete config[key];let calls=0;await assert.rejects(loadConservationRoute(config,async()=>{calls++;throw Error('Unexpected network');},now));assert.equal(calls,0);}
 const transportCalls=transport();await assert.rejects(loadConservationRoute(env,transportCalls.fetcher,new Date(NaN)));assert.equal(transportCalls.calls.length,0);
});
test('conservation runtime reads fixed published path and same-site SEO without caching',async()=>{
 const {calls,fetcher}=transport(),result=await loadConservationRoute(env,fetcher,now);
 assert.equal(result.page.path,'/conservation-commitment');assert.deepEqual(result.seoDefaults,settings().seo);
 assert.deepEqual(calls.map(c=>c.body),[{p_site:id,p_path:'/conservation-commitment',p_locale:'en'},{p_site:id,p_locale:'en'}]);
 assert.ok(calls[0].url.endsWith('/get_public_page'));assert.ok(calls[1].url.endsWith('/get_public_seo_settings'));
 for(const call of calls)assert.equal(call.options.cache,'no-store');
});
test('conservation runtime distinguishes missing page from bad data, failed transport and missing settings',async()=>{
 const absent=transport(null);assert.equal(await loadConservationRoute(env,absent.fetcher,now),null);assert.equal(absent.calls.length,1);
 const malformed=transport({});await assert.rejects(loadConservationRoute(env,malformed.fetcher,now));assert.equal(malformed.calls.length,1);
 await assert.rejects(loadConservationRoute(env,transport(page(),null).fetcher,now),/SEO defaults/);
 await assert.rejects(loadConservationRoute(env,transport(page(),{...settings(),websiteId:'00000000-0000-4000-8000-000000000002'}).fetcher,now),/identity mismatch/);
 await assert.rejects(loadConservationRoute(env,async()=>Response.json({error:'unavailable'},{status:503}),now));
});
