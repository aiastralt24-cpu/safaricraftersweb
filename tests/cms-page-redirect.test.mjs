import test from 'node:test';import assert from 'node:assert/strict';
import {parsePageRedirect,readPageRedirect,pageRedirectResponse} from '../lib/cms/page-redirect.ts';
const site='00000000-0000-4000-8000-000000000001',env={CMS_PAGE_REDIRECTS_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'fixture'};
const redirect={from:'/old-address',to:'/new-address',status:308};
test('redirect delivery is disabled by default and excludes reserved/noncanonical paths',async()=>{
 const fail=async()=>assert.fail('Unexpected database read');assert.equal(await readPageRedirect('/old-address',{},fail),null);
 for(const path of ['/api/private','/cms','//outside.test','/bad%20path','/journal/article','/'])assert.equal(await readPageRedirect(path,env,fail),null);
 await assert.rejects(readPageRedirect('/old-address',{...env,CMS_PUBLIC_DELIVERY_ENABLED:'false'},fail),/not configured/);
});
test('public lookup is site-bound, uncached and preserves same-origin queries in redirect responses',async()=>{
 let call;const result=await readPageRedirect('/old-address',env,async(url,options)=>{call={url:String(url),options};return Response.json(redirect);});assert.deepEqual(result,redirect);assert.match(call.url,/get_public_page_redirect$/);assert.deepEqual(JSON.parse(call.options.body),{p_site:site,p_path:'/old-address',p_locale:'en'});assert.equal(call.options.cache,'no-store');assert.equal(call.options.redirect,'error');assert.ok(call.options.signal);
 const response=pageRedirectResponse('https://site.test/old-address?campaign=safari',result);assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://site.test/new-address?campaign=safari');assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(pageRedirectResponse('https://site.test/old-address',null),null);
});
test('malformed, cyclic, mismatched and external redirect targets fail closed',async()=>{
 for(const patch of [{from:'/other'},{to:'/old-address'},{to:'https://outside.test'},{to:'//outside.test'},{to:'/cms'},{to:'/new?next=x'},{status:302},{privateNote:'secret'}])assert.throws(()=>parsePageRedirect({...redirect,...patch},'/old-address'));
 await assert.rejects(readPageRedirect('/old-address',env,async()=>Response.json({to:'/other'})));
 await assert.rejects(readPageRedirect('/old-address',env,async()=>new Response('',{status:503})));
});

test('localized redirect reads exact languages and preserves language, origin and query in responses',async()=>{
 for(const locale of ['fr','fr-CA','en-US']){
  let request;const value=await readPageRedirect('/old-address',{...env,CMS_LOCALIZED_PAGES_ENABLED:'true'},async(url,options)=>{request=JSON.parse(options.body);return Response.json(redirect);},locale);assert.equal(request.p_locale,locale);
  const response=pageRedirectResponse(`https://site.test/languages/${locale}/old-address?campaign=a%20b`,value,locale);assert.equal(response.status,308);assert.equal(response.headers.get('location'),`https://site.test/languages/${locale}/new-address?campaign=a%20b`);
 }
 const fail=async()=>assert.fail('Unexpected localized lookup');assert.equal(await readPageRedirect('/old-address',env,fail,'fr'),null);
 await assert.rejects(readPageRedirect('/old-address',env,fail,'fr/../en'),/Invalid redirect language/);
 for(const url of ['https://site.test/old-address','https://site.test/languages/en/old-address','https://site.test/languages/fr-CA/old-address'])assert.throws(()=>pageRedirectResponse(url,redirect,'fr'),/language/);
 assert.throws(()=>pageRedirectResponse('https://site.test/languages/fr/old-address',{...redirect,to:'/languages/en/new-address'},'fr'));
 assert.equal(pageRedirectResponse('https://site.test/languages/fr/old-address',null,'fr'),null);
});
