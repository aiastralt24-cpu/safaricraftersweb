import test from 'node:test';import assert from 'node:assert/strict';
import {languageAlternates,withLanguageMetadata} from '../lib/cms/language-metadata.ts';
import {resolvedSeoMetadata} from '../lib/cms/seo-metadata.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const origin='https://example.com',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const variants=[{recordId:id(1),revisionId:id(2),locale:'en',path:'/story',href:'/story',indexable:true,canonical:''},{recordId:id(3),revisionId:id(4),locale:'fr-CA',path:'/histoire',href:'/languages/fr-CA/histoire',indexable:true,canonical:''}];
test('language metadata emits reciprocal absolute self-inclusive URLs with regional tags',()=>{
 const expected={en:origin+'/story','fr-CA':origin+'/languages/fr-CA/histoire'};
 for(const row of variants)assert.deepEqual(languageAlternates(variants,row.locale,row.href,origin),expected);
 for(const change of [v=>v[1].indexable=false,v=>v[1].canonical='https://other.test/story',v=>v.pop()]){const value=structuredClone(variants);change(value);assert.deepEqual(languageAlternates(value,'en','/story',origin),{});}
 assert.deepEqual(languageAlternates(variants,'fr','/missing',origin),{});assert.deepEqual(languageAlternates(null,'en','/story',origin),{});
 assert.throws(()=>languageAlternates(variants,'en','/story','http://example.com'));
});
test('regional visitor metadata accepts region casing without broadening ordinary page URLs',()=>{
 const metadata=resolvedSeoMetadata(newPageSeo(),newGlobalSettings().seo,{origin,path:'/languages/fr-CA/histoire',title:'Notre histoire'});assert.equal(metadata.alternates.canonical,origin+'/languages/fr-CA/histoire');
 for(const path of ['/Story','/languages/fr-Ca/histoire','/languages/fr-CA/Story','//example.com','/languages/fr-CA//histoire','/languages/fr-CA/../histoire'])assert.throws(()=>resolvedSeoMetadata(newPageSeo(),newGlobalSettings().seo,{origin,path,title:'Story'}));
});
test('metadata transport binds current publication and preserves canonical, robots and other metadata',async()=>{
 const page={recordId:id(1),revisionId:id(2),locale:'en',path:'/story'},base={title:'Story',robots:{index:true},alternates:{canonical:origin+'/story'}},env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(9),CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 let count=0;const fetcher=async(url,options)=>{count++;assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:id(9),p_record:id(1),p_revision:id(2),p_locale:'en'});return Response.json({websiteId:id(9),recordId:id(1),revisionId:id(2),locale:'en',variants:variants.map(({href,...v})=>v)});};
 assert.deepEqual(await withLanguageMetadata(base,page,origin,{},fetcher),base);assert.equal(count,0);
 const result=await withLanguageMetadata(base,page,origin,env,fetcher);assert.equal(result.title,'Story');assert.equal(result.alternates.canonical,base.alternates.canonical);assert.equal(Object.keys(result.alternates.languages).length,2);
 for(const metadata of [{...base,robots:{index:false}},{...base,alternates:{canonical:'https://other.test/story'}}])assert.deepEqual((await withLanguageMetadata(metadata,page,origin,env,fetcher)).alternates.languages,{});
 await assert.rejects(()=>withLanguageMetadata(base,page,origin,env,async()=>Response.json({websiteId:id(9),recordId:id(1),revisionId:id(8),locale:'en',variants:[]})),/changed/);
});
