import test from 'node:test';import assert from 'node:assert/strict';
import {loadContactRoute,usesCmsContact} from '../lib/cms/contact-page-runtime.ts';
import {contactMigrationDependencies,planContactMigration} from '../lib/cms/contact-migration.ts';
import {planContactFormMigration} from '../lib/cms/contact-form-migration.ts';
const site='00000000-0000-4000-8000-000000000001',form='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003',now=new Date('2026-10-23');
const env={CMS_CONTACT_PAGE_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_ENQUIRY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'anon-fixture',CMS_SUPABASE_SERVICE_ROLE_KEY:'service-fixture',CMS_PUBLIC_SITE_ORIGIN:'https://example.test',CMS_ENQUIRY_INGRESS_SECRET:'i'.repeat(32),CMS_ENQUIRY_IDENTITY_SECRET:'s'.repeat(32),CMS_TURNSTILE_SECRET:'secret',CMS_TURNSTILE_SITE_KEY:'public-key'};
function page(){const payload=structuredClone(planContactMigration(contactMigrationDependencies).previewPayload);payload.composition.sections[1].data.form={recordId:form};return {recordId:site,revisionId:revision,type:'page',payload};}
function transport(overrides={}){const values={get_public_page:page(),get_published_form:{websiteId:site,formId:form,revisionId:revision,locale:'en',definition:planContactFormMigration(contactMigrationDependencies).forms[0].definition},get_public_seo_settings:{websiteId:site,recordId:site,revisionId:revision,locale:'en',seo:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}},...overrides},calls=[];return {calls,fetcher:async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1);calls.push({name,options,body:JSON.parse(options.body)});return Response.json(values[name]);}};}
test('contact runtime requires route/public/intake configuration before network IO',async()=>{
 assert.equal(usesCmsContact({}),false);assert.equal(usesCmsContact({CMS_CONTACT_PAGE_ENABLED:'TRUE'}),false);
 for(const key of Object.keys(env)){const config={...env};delete config[key];let calls=0;await assert.rejects(loadContactRoute(config,async()=>{calls++;throw Error();},now),key);assert.equal(calls,0,key);}
 const io=transport();await assert.rejects(loadContactRoute(env,io.fetcher,new Date(NaN)));assert.equal(io.calls.length,0);
});
test('contact runtime reads published page/form/SEO and returns only safe form identities',async()=>{
 const io=transport(),result=await loadContactRoute(env,io.fetcher,now);assert.equal(result.forms.current.revisionId,revision);assert.deepEqual(io.calls.map(c=>c.name),['get_public_page','get_published_form','get_public_seo_settings']);assert.deepEqual(io.calls[0].body,{p_site:site,p_path:'/contact',p_locale:'en'});assert.deepEqual(io.calls[1].body,{p_site:site,p_form:form});for(const call of io.calls)assert.equal(call.options.cache,'no-store');assert.equal(JSON.stringify(result).includes('service-fixture'),false);assert.equal(JSON.stringify(result.forms).includes('definition'),false);
});
test('withdrawal stops dependency reads and failed form/SEO reads never substitute drafts',async()=>{
 const missing=transport({get_public_page:null});assert.equal(await loadContactRoute(env,missing.fetcher,now),null);assert.equal(missing.calls.length,1);
 const formMissing=transport({get_published_form:null});await assert.rejects(loadContactRoute(env,formMissing.fetcher,now),/not published/);assert.equal(formMissing.calls.length,2);
 await assert.rejects(loadContactRoute(env,transport({get_public_seo_settings:null}).fetcher,now),/SEO defaults/);await assert.rejects(loadContactRoute(env,async()=>Response.json({error:'unavailable'},{status:503}),now));
});
