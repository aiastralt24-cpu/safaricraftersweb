import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublishedNavigation,navigationReader} from '../lib/cms/published-navigation.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',target='00000000-0000-4000-8000-000000000003';
const item=(id,parentId=null)=>({id,parentId,label:id,target:{kind:'group'},visibility:{visible:true}});
const context={now:new Date('2026-10-22T00:00:00Z')},identity={site,record,locale:'en'};
function data(){return {websiteId:site,recordId:record,revisionId:record,locale:'en',payload:{schemaVersion:1,title:'Explore',items:[item('root'),{...item('journey','root'),target:{kind:'record',recordId:target,contentType:'journey'}},{...item('child','journey'),target:{kind:'url',href:'/contact'}}]},references:[{recordId:target,available:true,title:'Forest journey',type:'journey',path:'/journeys/forest',locale:'en'}]};}
test('published navigation resolves exact record links while unavailable ancestors suppress subtrees and empty groups',()=>{
 const d=data(),before=structuredClone(d),result=projectPublishedNavigation(d,identity,context);assert.deepEqual(result.items.map(v=>v.id),['root','journey','child']);assert.deepEqual(result.items[1].link,{href:'/journeys/forest',newWindow:false});assert.deepEqual(d,before);
 d.references=[{recordId:target,available:false}];assert.deepEqual(projectPublishedNavigation(d,identity,context).items,[]);
});
test('navigation projection rejects wrong identities, missing or substituted evidence and wrong paths',()=>{
 for(const change of [{websiteId:record},{recordId:site},{locale:'fr'},{references:[]},{references:[...data().references,...data().references]},{references:[{...data().references[0],path:'/journal/forest'}]},{privateNotes:'hidden'}])assert.throws(()=>projectPublishedNavigation({...data(),...change},identity,context));
 const d=data();d.payload.items[1].target.contentType='destination';assert.deepEqual(projectPublishedNavigation(d,identity,context).items,[]);
});
test('published menus preserve visibility boundaries and omit unavailable featured references',()=>{
 const d=data();d.payload.items[0].visibility={visible:true,regions:['india'],until:'2026-11-01T00:00:00Z'};d.payload.items[2].featuredContent=[{recordId:site}];d.references.push({recordId:site,available:false});
 assert.deepEqual(projectPublishedNavigation(d,identity,context).items,[]);
 const result=projectPublishedNavigation(d,identity,{...context,region:'india'});assert.equal(result.items.length,3);assert.deepEqual(result.items[2].featuredContent,[]);
 assert.deepEqual(projectPublishedNavigation(d,identity,{now:new Date('2026-11-01T00:00:00Z'),region:'india'}).items,[]);
});
test('navigation reader binds anonymous RPC and treats missing publication separately from failure',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const read=navigationReader(env,async(url,options)=>{assert.match(String(url),/get_public_navigation$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_record:record,p_locale:'en'});return Response.json(data());});assert.equal((await read(record,context)).items.length,3);
 assert.equal(await navigationReader(env,async()=>Response.json(null))(record,context),null);assert.throws(()=>navigationReader({}));
});
test('header rollout remains offline by default and never silently falls back when enabled',async()=>{
 const {readHeaderNavigation}=await import('../lib/cms/header-navigation.ts');
 assert.equal(await readHeaderNavigation({},async()=>assert.fail('disabled read')),undefined);
 await assert.rejects(readHeaderNavigation({CMS_NAVIGATION_DELIVERY_ENABLED:'true'}),/Choose a published/);
 const env={CMS_NAVIGATION_DELIVERY_ENABLED:'true',CMS_MAIN_NAVIGATION_ID:record,CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 await assert.rejects(readHeaderNavigation(env,async()=>Response.json(null)),/unavailable/);
 assert.equal((await readHeaderNavigation(env,async()=>Response.json(data()),context.now)).items.length,3);
});

test('localized menus require route resolution and reject source-language record evidence',async()=>{
 const d=data();d.locale='fr';d.references[0].locale='fr';d.payload.items[2].featuredContent=[{recordId:target}];const expected={...identity,locale:'fr'},resolveLocalizedRoute=(path,locale)=>`/language/${locale}${path}`;
 assert.throws(()=>projectPublishedNavigation(d,expected,context),/verified route/);
 const result=projectPublishedNavigation(d,expected,{...context,resolveLocalizedRoute});assert.equal(result.items[1].link.href,'/language/fr/journeys/forest');assert.equal(result.items[2].link.href,'/language/fr/contact');assert.equal(result.items[2].featuredContent[0].href,'/language/fr/journeys/forest');
 for(const invalid of [null,'/contact','//evil.test','/bad path','/bad\\path','/bad\npath'])assert.throws(()=>projectPublishedNavigation(d,expected,{...context,resolveLocalizedRoute:()=>invalid}),/route is unavailable/);
 d.references[0].locale='en';assert.throws(()=>projectPublishedNavigation(d,expected,{...context,resolveLocalizedRoute}),/target path mismatch/);d.references[0].locale='fr';
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};let calls=0;
 const read=navigationReader(env,async(url,options)=>{calls++;assert.equal(JSON.parse(options.body).p_locale,'fr');return Response.json(d);});
 await assert.rejects(read(record,{...context,locale:'fr'}),/verified route/);assert.equal(calls,0);assert.equal((await read(record,{...context,locale:'fr',resolveLocalizedRoute})).locale,'fr');assert.equal(calls,1);
});
