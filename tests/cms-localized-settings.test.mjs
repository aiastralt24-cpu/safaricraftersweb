import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedSettings,settingsReader} from '../lib/cms/public-settings.ts';
import {readPublishedSeoSettings,seoSettingsReader} from '../lib/cms/public-seo-settings.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002';
const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key'};
for(const [name,read,transport,field,rpc] of [['settings',readPublishedSettings,settingsReader,'payload','get_public_settings'],['SEO',readPublishedSeoSettings,seoSettingsReader,'seo','get_public_seo_settings']]){
 test(`${name} reads exact language variants without fallback or identity substitution`,async()=>{
  for(const locale of ['fr','pt-BR','qac']){
   const row={websiteId:site,recordId:record,revisionId:record,locale,[field]:field==='payload'?newGlobalSettings():newGlobalSettings().seo};let calls=0;
   const fetcher=async(url,options)=>{calls++;assert.ok(String(url).endsWith('/'+rpc));assert.equal(options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:locale});return Response.json(row);};
   assert.deepEqual(await read(site,locale,transport(env,fetcher)),row);assert.equal(calls,1);
   for(const language of ['en',locale==='fr'?'fr-CA':'pt'])await assert.rejects(read(site,locale,async()=>({...row,locale:language})),/identity mismatch/);
   let attempts=0;assert.equal(await read(site,locale,async(s,l)=>{attempts++;assert.equal(l,locale);return null;}),null);assert.equal(attempts,1);
  }
  for(const locale of ['', 'FR','fr_CA','../en']){await assert.rejects(read(site,locale,async()=>assert.fail('invalid request reached reader')));assert.throws(()=>transport(env,async()=>assert.fail('invalid transport'))(site,locale));}
 });
}
