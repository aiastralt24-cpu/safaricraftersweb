import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedLanguageVariants,readPublicLanguageVariants} from '../lib/cms/public-language-variants.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,expected={site:id(1),record:id(2),revision:id(3),locale:'fr'};
const data=()=>({websiteId:id(1),recordId:id(2),revisionId:id(3),locale:'fr',variants:[{recordId:id(4),revisionId:id(5),locale:'en',path:'/our-story',indexable:true,canonical:''},{recordId:id(2),revisionId:id(3),locale:'fr',path:'/notre-histoire',indexable:false,canonical:'https://example.com/canonical'}]});
test('public language variants verify parent identity and derive supported visitor URLs only',()=>{
 const result=verifiedLanguageVariants(data(),expected);assert.deepEqual(result.map(v=>v.href),['/our-story','/languages/fr/notre-histoire']);assert.equal(result[1].indexable,false);assert.equal(verifiedLanguageVariants(null,expected),null);
 for(const change of [v=>v.websiteId=id(9),v=>v.revisionId=id(9),v=>v.variants.push(v.variants[0]),v=>v.variants[1].recordId=id(9),v=>v.variants[0].path='/cms',v=>v.variants[0].canonical='javascript:alert(1)',v=>v.sourceDraftTitle='private']){const value=data();change(value);assert.throws(()=>verifiedLanguageVariants(value,expected));}
});
test('language variant reader stays offline when disabled and uses anonymous exact-revision requests',async()=>{
 let calls=0;const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_SUPABASE_SERVICE_ROLE_KEY:'do-not-send'};
 const fetcher=async(url,options)=>{calls++;assert.match(String(url),/get_public_language_variants$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:id(1),p_record:id(2),p_revision:id(3),p_locale:'fr'});return Response.json(data());};
 assert.equal(await readPublicLanguageVariants(expected,{},fetcher),null);assert.equal(calls,0);assert.equal((await readPublicLanguageVariants(expected,env,fetcher)).length,2);assert.equal(calls,1);
 await assert.rejects(()=>readPublicLanguageVariants(expected,{...env,CMS_WEBSITE_ID:id(9)},fetcher),/not configured/);assert.equal(calls,1);
});
