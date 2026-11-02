import test from 'node:test';import assert from 'node:assert/strict';
import {usesCmsTanzania,parsePublicTanzania,readPublishedTanzania} from '../lib/cms/published-tanzania.ts';
import {tanzaniaSitemapItems} from '../lib/cms/tanzania-sitemap.ts';
import {planTanzaniaMigration,tanzaniaMigrationDependencies} from '../lib/cms/tanzania-migration.ts';
import inventory from '../docs/cms/tanzania-source-inventory.json' with {type:'json'};
const [site,record,revision,other]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),now=new Date('2026-10-28');
const env={CMS_TANZANIA_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'anon-fixture'};
function page(){return {websiteId:site,recordId:record,revisionId:revision,type:'page',path:'/destinations/tanzania',locale:'en',payload:planTanzaniaMigration(tanzaniaMigrationDependencies,inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`image-${i}`}))).previewPayload};}
const settings=()=>({websiteId:site,recordId:record,revisionId:revision,locale:'en',seo:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}});
function transport(overrides={}){const values={get_public_tanzania:page(),get_public_seo_settings:settings(),...overrides},calls=[],counts={};return {calls,fetcher:async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1),count=counts[name]=(counts[name]??0)+1;calls.push({name,options,body:JSON.parse(options.body)});assert.ok(Object.hasOwn(values,name),'Published RPCs only');const value=values[name];return Response.json(typeof value==='function'?value(count):value);}};}
test('Tanzania loader is disabled by default and checks configuration before network access',async()=>{
 assert.equal(usesCmsTanzania({}),false);assert.equal(usesCmsTanzania({CMS_TANZANIA_DELIVERY_ENABLED:'TRUE'}),false);assert.equal(await readPublishedTanzania({},async()=>{throw Error('No network');}),undefined);
 for(const key of Object.keys(env).filter(k=>k!=='CMS_TANZANIA_DELIVERY_ENABLED')){const config={...env};delete config[key];let calls=0;await assert.rejects(readPublishedTanzania(config,async()=>{calls++;throw Error();},now));assert.equal(calls,0,key);}
 await assert.rejects(readPublishedTanzania(env,async()=>{throw Error('No network');},new Date(NaN)),/configured/);
});
test('Tanzania loader uses anonymous no-store reads and preserves source content and query-bearing links',async()=>{
 const io=transport(),result=await readPublishedTanzania(env,io.fetcher,now);assert.equal(io.calls.length,4);assert.equal(result.content.page.sections.length,9);assert.equal(result.content.page.sections[7].data.planner.interest,'Tanzania');assert.equal(result.seoDefaults.titleTemplate,'%s | Brand');
 for(const call of io.calls){assert.equal(call.options.cache,'no-store');assert.equal(call.options.headers.Authorization,'Bearer anon-fixture');assert.equal(call.body.p_site,site);assert.equal(call.body.p_locale,'en');}
 assert.doesNotMatch(JSON.stringify(result),/anon-fixture|service-fixture/);
});
test('Tanzania loader rejects foreign or malformed identities and never falls back to legacy/draft data',async()=>{
 for(const patch of [{websiteId:other},{recordId:'invalid'},{path:'/destinations/kenya'},{locale:'fr'},{type:'destination'},{internal:'private'}])assert.throws(()=>parsePublicTanzania({...page(),...patch},site,now));
 const missing=transport({get_public_tanzania:null});assert.equal(await readPublishedTanzania(env,missing.fetcher,now),null);assert.equal(missing.calls.length,1);
 for(const seo of [null,{...settings(),websiteId:other},{...settings(),locale:'fr'}])await assert.rejects(readPublishedTanzania(env,transport({get_public_seo_settings:seo}).fetcher,now));
 await assert.rejects(readPublishedTanzania(env,async()=>Response.json({error:'down'},{status:503}),now));
 const bad=page();bad.payload.composition.sections=[];await assert.rejects(readPublishedTanzania(env,transport({get_public_tanzania:bad}).fetcher,now));
});
test('Tanzania loader detects withdrawal, revision changes, content changes and SEO changes during loading',async()=>{
 for(const overrides of [{get_public_tanzania:n=>n===1?page():null},{get_public_tanzania:n=>({...page(),revisionId:n===1?revision:other})},{get_public_tanzania:n=>{const value=page();if(n>1)value.payload.composition.title='Changed';return value;}},{get_public_seo_settings:n=>n===1?settings():null},{get_public_seo_settings:n=>({...settings(),revisionId:n===1?revision:other})}])await assert.rejects(readPublishedTanzania(env,transport(overrides).fetcher,now),/changed while loading/);
});
test('Tanzania sitemap entries obey published SEO and never fabricate modification times',async()=>{
 const origin='https://safaricrafters.com';assert.deepEqual(tanzaniaSitemapItems(null,origin),[]);assert.deepEqual(tanzaniaSitemapItems(undefined,origin),[]);
 const value=await readPublishedTanzania(env,transport().fetcher,now);assert.deepEqual(tanzaniaSitemapItems(value,origin),[{url:origin+'/destinations/tanzania'}]);value.content.page.seo.indexing='noindex';assert.deepEqual(tanzaniaSitemapItems(value,origin),[]);value.content.page.seo.indexing='index';value.content.page.seo.sitemap='exclude';assert.deepEqual(tanzaniaSitemapItems(value,origin),[]);
});
