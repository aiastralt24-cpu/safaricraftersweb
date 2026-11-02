import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedLocalizedRoutes,localizedPageHref,readLocalizedRoutes,localizedRoutesReader} from '../lib/cms/localized-routes.ts';
import {navigationLinkForLocale} from '../lib/cms/localized-navigation-link.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',paths=['/our-story','/contact'];
const value=()=>({websiteId:site,locale:'fr',routes:[{path:paths[0],available:true,recordId:record,revisionId:record},{path:paths[1],available:false}]});
test('localized route registry requires complete exact identities and resolves only known published paths',()=>{
 const result=verifiedLocalizedRoutes(value(),site,'fr',paths);assert.equal(result.resolve('/our-story?ref=menu#main','fr'),'/languages/fr/our-story?ref=menu#main');assert.equal(result.resolve('/contact','fr'),null);assert.equal(result.resolve('/our-story','de'),null);assert.equal(result.resolve('/not-requested','fr'),null);
 assert.equal(navigationLinkForLocale('https://safaricrafters.com/our-story','fr',result.resolve),'/languages/fr/our-story');assert.throws(()=>navigationLinkForLocale('/contact','fr',result.resolve));
 for(const bad of [{...value(),websiteId:record},{...value(),locale:'de'},{...value(),routes:[]},{...value(),routes:[...value().routes].reverse()},{...value(),routes:[{...value().routes[0],path:'/languages/fr/foo'},value().routes[1]]},{...value(),routes:[value().routes[0],{...value().routes[0],path:'/contact'}]}])assert.throws(()=>verifiedLocalizedRoutes(bad,site,'fr',paths));
 for(const locale of ['en','FR',''])assert.throws(()=>localizedPageHref(locale,'/our-story'));assert.equal(localizedPageHref('pt-BR','/our-story'),'/languages/pt-BR/our-story');
});
test('localized route transport is opt-in bounded anonymous and has no fallback reads',async()=>{
 assert.throws(()=>localizedRoutesReader({}));let calls=0;
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const reader=localizedRoutesReader(env,async(url,options)=>{calls++;assert.ok(String(url).endsWith('/get_public_localized_routes'));assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'fr',p_paths:paths});return Response.json(value());});
 assert.equal((await readLocalizedRoutes(site,'fr',paths,reader)).routes.length,2);assert.equal(calls,1);assert.throws(()=>reader(record,'fr',paths));
 for(const input of [[paths[0],paths[0]],Array.from({length:1001},(_,i)=>`/path-${i}`),['/a?x=1']])await assert.rejects(readLocalizedRoutes(site,'fr',input,async()=>assert.fail('invalid read')));
 await assert.rejects(readLocalizedRoutes(site,'fr',paths,async()=>null));assert.equal(calls,1);
});
