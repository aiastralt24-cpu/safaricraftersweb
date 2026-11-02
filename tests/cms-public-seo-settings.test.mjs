import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedSeoSettings,seoSettingsReader} from '../lib/cms/public-seo-settings.ts';
import {resolveSeoDefaults} from '../lib/cms/seo-resolution.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const site='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const row=()=>({websiteId:site,recordId:site,revisionId:other,locale:'en',seo:newGlobalSettings().seo});
test('published SEO reader validates identities and exact public fields without a draft fallback',async()=>{
 assert.deepEqual(await readPublishedSeoSettings(site,'en',async()=>row()),row());
 assert.equal(await readPublishedSeoSettings(site,'en',async()=>null),null);
 for(const data of [{...row(),websiteId:other},{...row(),locale:'fr'},{...row(),internal:'secret'},{...row(),seo:{...row().seo,privateNote:'hidden'}},{...row(),seo:{...row().seo,titleTemplate:'No placeholder'}}])await assert.rejects(readPublishedSeoSettings(site,'en',async()=>data));
 await assert.rejects(readPublishedSeoSettings(site,'invalid_locale',async()=>assert.fail('invalid locale reached backend')));
 await assert.rejects(readPublishedSeoSettings(site,'en',async()=>{throw Error('offline');}),/offline/);
});
test('public SEO defaults resolve page overrides and restrictive indexing without requiring private settings',async()=>{
 const value=await readPublishedSeoSettings(site,'en',async()=>({...row(),seo:{...row().seo,indexing:'noindex',description:'Published description'}}));
 const page={...newPageSeo(),indexing:'index',sitemap:'include'};
 const result=resolveSeoDefaults(page,value.seo,{origin:'https://site.test',path:'/journal/story',title:'Story'});
 assert.equal(result.title.value,'Story | Safari Crafters');assert.equal(result.description.value,'Published description');assert.equal(result.indexing.value,'noindex');assert.equal(result.sitemap.value,false);
 const self=resolveSeoDefaults({...page,canonical:'https://SITE.test:443/journal/story'},row().seo,{origin:'https://site.test',path:'/journal/story',title:'Story'});assert.equal(self.sitemap.value,true);
});
test('SEO RPC uses anonymous credentials and refuses another website before network access',async()=>{
 let calls=0;const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key'};
 const read=seoSettingsReader(env,async(url,options)=>{calls++;assert.match(String(url),/get_public_seo_settings$/);assert.equal(options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en'});return Response.json(row());});
 await readPublishedSeoSettings(site,'en',read);assert.equal(calls,1);assert.throws(()=>read(other,'en'));assert.equal(calls,1);assert.throws(()=>seoSettingsReader({}));
});
