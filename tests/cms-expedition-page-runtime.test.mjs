import test from 'node:test';
import assert from 'node:assert/strict';
import {expeditionPageConfig,loadExpeditionRoute} from '../lib/cms/expedition-page-runtime.ts';
import {usesCmsExpedition} from '../lib/cms/expedition-route.ts';
import {createExpeditionDirectorySection} from '../lib/cms/section-drafts.ts';
const site='00000000-0000-4000-8000-000000000001';
const env={CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-use'};
const page={recordId:site,revisionId:site,type:'page',payload:{composition:{schemaVersion:1,title:'Expeditions',sections:[{id:'title',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Our field team',body:[]}},createExpeditionDirectorySection('directory')]}}};
const seo={websiteId:site,recordId:site,revisionId:site,locale:'en',seo:{titleTemplate:'%s | Safari',description:'Published default description',indexing:'noindex'}};
function transport(overrides={},seen=[]){return async(url,options)=>{
 const procedure=url.pathname.split('/').at(-1);seen.push({procedure,headers:options.headers,body:JSON.parse(options.body)});
 const values={get_public_page:page,get_public_seo_settings:seo,list_public_expeditions:{websiteId:site,locale:'en',snapshot:'a'.repeat(32),items:[],nextCursor:null},...overrides};
 assert.ok(Object.hasOwn(values,procedure));return Response.json(values[procedure]);
};}
test('expedition route is opt-in and uses only fixed published readers and anonymous credentials',async()=>{
 assert.equal(usesCmsExpedition({}),false);assert.equal(usesCmsExpedition({CMS_EXPEDITION_DELIVERY_ENABLED:'TRUE'}),false);assert.equal(expeditionPageConfig({}),null);
 const seen=[];const value=await loadExpeditionRoute(env,transport({},seen));assert.equal(value.page.title,'Expeditions');assert.deepEqual(value.expeditions,[]);assert.equal(value.seoDefaults.indexing,'noindex');assert.match(value.today,/^\d{4}-\d{2}-\d{2}$/);
 assert.deepEqual(seen.map(v=>v.procedure).sort(),['get_public_page','get_public_seo_settings','list_public_expeditions']);
 assert.deepEqual(seen.find(v=>v.procedure==='get_public_page').body,{p_site:site,p_path:'/photo-expeditions',p_locale:'en'});
 for(const call of seen){assert.equal(call.headers.Authorization,'Bearer anon');assert.equal(call.body.p_site,site);assert.equal(call.body.p_locale,'en');}
 assert.doesNotMatch(JSON.stringify(seen),/never-use/);
 const config=expeditionPageConfig(env,transport());for(const args of [[site,'/about','en'],[site,'/photo-expeditions','fr'],['00000000-0000-4000-8000-000000000002','/photo-expeditions','en']])assert.throws(()=>config.readPage(...args),/identity/);
});
test('enabled expedition delivery never converts configuration, SEO or dependency errors to legacy content',async()=>{
 await assert.rejects(loadExpeditionRoute({},transport()),/disabled/);
 for(const patch of [{CMS_PUBLIC_DELIVERY_ENABLED:'false'},{CMS_WEBSITE_ID:'bad'},{CMS_SUPABASE_ANON_KEY:''}])assert.throws(()=>expeditionPageConfig({...env,...patch}),/not configured/);
 assert.equal(await loadExpeditionRoute(env,transport({get_public_page:null})),null);
 await assert.rejects(loadExpeditionRoute(env,transport({get_public_seo_settings:null})),/SEO defaults/);
 await assert.rejects(loadExpeditionRoute(env,transport({get_public_seo_settings:{...seo,websiteId:'00000000-0000-4000-8000-000000000002'}})),/identity/);
 await assert.rejects(loadExpeditionRoute(env,transport({list_public_expeditions:{websiteId:site,locale:'en',items:[],nextCursor:{sortOrder:0,recordId:site}}})),/snapshot|Invalid/);
 await assert.rejects(loadExpeditionRoute(env,async()=>{throw Error('offline');}));
});
