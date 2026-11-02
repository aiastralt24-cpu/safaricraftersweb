import test from 'node:test';
import assert from 'node:assert/strict';
import {usesCmsSpecialists,specialistPageConfig,loadSpecialistRoute} from '../lib/cms/specialist-page-runtime.ts';
import {createSpecialistDirectorySection} from '../lib/cms/section-drafts.ts';
const site='00000000-0000-4000-8000-000000000001';
const env={CMS_SPECIALISTS_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-use'};
const page={recordId:site,revisionId:site,type:'page',payload:{composition:{schemaVersion:1,title:'Specialists',sections:[{id:'title',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Our field team',body:[]}},createSpecialistDirectorySection('directory')]}}};
const seo={websiteId:site,recordId:site,revisionId:site,locale:'en',seo:{titleTemplate:'%s | Safari',description:'Published default description',indexing:'noindex'}};
function transport(overrides={},seen=[]){return async(url,options)=>{
 const procedure=url.pathname.split('/').at(-1);seen.push({procedure,headers:options.headers,body:JSON.parse(options.body)});
 const values={get_public_page:page,get_public_seo_settings:seo,list_public_specialists:{websiteId:site,locale:'en',items:[],nextCursor:null},...overrides};
 assert.ok(Object.hasOwn(values,procedure));return Response.json(values[procedure]);
};}
test('specialist route is opt-in and uses only fixed published readers and anonymous credentials',async()=>{
 assert.equal(usesCmsSpecialists({}),false);assert.equal(usesCmsSpecialists({CMS_SPECIALISTS_DELIVERY_ENABLED:'TRUE'}),false);assert.equal(specialistPageConfig({}),null);
 const seen=[];const value=await loadSpecialistRoute(env,transport({},seen));assert.equal(value.page.title,'Specialists');assert.deepEqual(value.profiles,[]);assert.equal(value.seoDefaults.indexing,'noindex');
 assert.deepEqual(seen.map(v=>v.procedure).sort(),['get_public_page','get_public_seo_settings','list_public_specialists']);
 assert.deepEqual(seen.find(v=>v.procedure==='get_public_page').body,{p_site:site,p_path:'/specialists',p_locale:'en'});
 for(const call of seen){assert.equal(call.headers.Authorization,'Bearer anon');assert.equal(call.body.p_site,site);assert.equal(call.body.p_locale,'en');}
 assert.doesNotMatch(JSON.stringify(seen),/never-use/);
 const config=specialistPageConfig(env,transport());for(const args of [[site,'/about','en'],[site,'/specialists','fr'],['00000000-0000-4000-8000-000000000002','/specialists','en']])assert.throws(()=>config.readPage(...args),/identity/);
});
test('enabled specialist delivery never converts configuration, SEO or dependency errors to legacy content',async()=>{
 await assert.rejects(loadSpecialistRoute({},transport()),/disabled/);
 for(const patch of [{CMS_PUBLIC_DELIVERY_ENABLED:'false'},{CMS_WEBSITE_ID:'bad'},{CMS_SUPABASE_ANON_KEY:''}])assert.throws(()=>specialistPageConfig({...env,...patch}),/not configured/);
 assert.equal(await loadSpecialistRoute(env,transport({get_public_page:null})),null);
 await assert.rejects(loadSpecialistRoute(env,transport({get_public_seo_settings:null})),/SEO defaults/);
 await assert.rejects(loadSpecialistRoute(env,transport({get_public_seo_settings:{...seo,websiteId:'00000000-0000-4000-8000-000000000002'}})),/identity/);
 await assert.rejects(loadSpecialistRoute(env,transport({list_public_specialists:{websiteId:site,locale:'en',items:[],nextCursor:{sortOrder:0,recordId:site}}})),/cursor/);
 await assert.rejects(loadSpecialistRoute(env,async()=>{throw Error('offline');}));
});
