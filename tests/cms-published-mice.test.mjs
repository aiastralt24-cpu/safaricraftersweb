import test from 'node:test';import assert from 'node:assert/strict';
import {usesCmsMice,parsePublicMice,readPublishedMice} from '../lib/cms/published-mice.ts';
import {planMiceMigration,miceMigrationDependencies} from '../lib/cms/mice-migration.ts';
import {planContactFormMigration} from '../lib/cms/contact-form-migration.ts';
import {contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
import inventory from '../docs/cms/mice-migration-inventory.json' with {type:'json'};
const [site,record,revision,form,formRevision,newRevision]=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),now=new Date('2026-10-28');
const env={CMS_MICE_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_ENQUIRY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'anon-fixture',CMS_SUPABASE_SERVICE_ROLE_KEY:'service-fixture',CMS_PUBLIC_SITE_ORIGIN:'https://example.test',CMS_ENQUIRY_INGRESS_SECRET:'i'.repeat(32),CMS_ENQUIRY_IDENTITY_SECRET:'s'.repeat(32),CMS_TURNSTILE_SECRET:'secret',CMS_TURNSTILE_SITE_KEY:'public-key'};
function page(){return {websiteId:site,recordId:record,revisionId:revision,type:'page',path:'/mice',locale:'en',payload:planMiceMigration(miceMigrationDependencies,inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`image-${i}`})),form).previewPayload};}
function transport(overrides={}){
 const values={get_public_mice:page(),get_published_form:{websiteId:site,formId:form,revisionId:formRevision,locale:'en',definition:planContactFormMigration(contactMigrationDependencies).forms.find(f=>f.variant==='corporate').definition},get_public_seo_settings:{websiteId:site,recordId:record,revisionId:revision,locale:'en',seo:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}},...overrides},calls=[],counts={};
 return {calls,fetcher:async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1),count=counts[name]=(counts[name]??0)+1;calls.push({name,options,body:JSON.parse(options.body)});const value=values[name];return Response.json(typeof value==='function'?value(count):value);}};
}
test('MICE loader is opt-in and requires working public/intake configuration before network IO',async()=>{
 assert.equal(usesCmsMice({}),false);assert.equal(usesCmsMice({CMS_MICE_DELIVERY_ENABLED:'TRUE'}),false);assert.equal(await readPublishedMice({},async()=>{throw Error('No network');}),undefined);
 for(const key of Object.keys(env).filter(k=>k!=='CMS_MICE_DELIVERY_ENABLED')){const config={...env};delete config[key];let calls=0;await assert.rejects(readPublishedMice(config,async()=>{calls++;throw Error();},now),key);assert.equal(calls,0,key);}
 await assert.rejects(readPublishedMice(env,async()=>{throw Error('No network');},new Date(NaN)),/configured/);
});
test('MICE loader uses no-store published reads and returns only safe form bindings',async()=>{
 const io=transport(),result=await readPublishedMice(env,io.fetcher,now);assert.equal(result.content.page.recordId,record);assert.equal(result.forms.current.revisionId,formRevision);assert.equal(io.calls.length,6);
 for(const call of io.calls){assert.equal(call.options.cache,'no-store');assert.equal(call.body.p_site,site);assert.equal(call.options.headers.Authorization,`Bearer ${call.name==='get_published_form'?'service-fixture':'anon-fixture'}`);}
 assert.doesNotMatch(JSON.stringify(result),/service-fixture|notificationRouteIds|definition|identitySecret/);
});
test('foreign/malformed public identities and unavailable dependencies never fall back to draft or legacy content',async()=>{
 for(const patch of [{websiteId:record},{path:'/contact'},{locale:'fr'},{type:'homepage'}])assert.throws(()=>parsePublicMice({...page(),...patch},site,now));
 const missing=transport({get_public_mice:null});assert.equal(await readPublishedMice(env,missing.fetcher,now),null);assert.equal(missing.calls.length,1);
 for(const name of ['get_published_form','get_public_seo_settings'])await assert.rejects(readPublishedMice(env,transport({[name]:null}).fetcher,now));
 await assert.rejects(readPublishedMice(env,async()=>Response.json({error:'down'},{status:503}),now));
 const definition=planContactFormMigration(contactMigrationDependencies).forms.find(f=>f.variant==='corporate').definition;definition.fields=definition.fields.filter(f=>f.id!=='phone');await assert.rejects(readPublishedMice(env,transport({get_published_form:{websiteId:site,formId:form,revisionId:formRevision,locale:'en',definition}}).fetcher,now),/incompatible/);
});
test('page, form or SEO changes during loading are detected on fresh reads',async()=>{
 const formValue={websiteId:site,formId:form,revisionId:formRevision,locale:'en',definition:planContactFormMigration(contactMigrationDependencies).forms.find(f=>f.variant==='corporate').definition};
 const settings={websiteId:site,recordId:record,revisionId:revision,locale:'en',seo:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}};
 for(const overrides of [
  {get_public_mice:n=>n===1?page():null},
  {get_public_mice:n=>({...page(),revisionId:n===1?revision:newRevision})},
  {get_published_form:n=>({...formValue,revisionId:n===1?formRevision:newRevision})},
  {get_public_seo_settings:n=>({...settings,revisionId:n===1?revision:newRevision})},
 ])await assert.rejects(readPublishedMice(env,transport(overrides).fetcher,now),/changed while loading/);
});

test('MICE sitemap reflects published SEO and omits missing, noindex and excluded pages',async()=>{
 const {miceSitemapItems}=await import('../lib/cms/mice-sitemap.ts');const origin='https://safaricrafters.com';
 assert.deepEqual(miceSitemapItems(null,origin),[]);assert.deepEqual(miceSitemapItems(undefined,origin),[]);
 const value=await readPublishedMice(env,transport().fetcher,now);assert.deepEqual(miceSitemapItems(value,origin),[{url:origin+'/mice'}]);
 value.content.page.seo.indexing='noindex';assert.deepEqual(miceSitemapItems(value,origin),[]);value.content.page.seo.indexing='index';value.content.page.seo.sitemap='exclude';assert.deepEqual(miceSitemapItems(value,origin),[]);
});
