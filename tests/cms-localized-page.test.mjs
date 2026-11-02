import test from 'node:test';import assert from 'node:assert/strict';
import {projectLocalizedCustomPage,localizedCustomPageMetadata} from '../lib/cms/custom-page.ts';
import {loadLocalizedCustomPage} from '../lib/cms/localized-page-runtime.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003',path='/notre-histoire',now=new Date('2026-10-28T00:00:00Z');
const input=()=>({recordId:record,revisionId:revision,type:'page',payload:{composition:{schemaVersion:1,title:'Notre histoire',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1',locales:['fr']},data:{title:'Notre histoire',body:[{kind:'paragraph',text:'Texte français.'},{kind:'link',label:'Autre page',href:'/autre-page'}]}},{id:'english',kind:'text',controls:{label:'English',locales:['en']},data:{title:'English copy',body:[{kind:'paragraph',text:'Do not render.'}]}}]}}});
const context={locale:'fr',now,resolveLocalizedRoute:(p,l)=>['/autre-page',path].includes(p)?`/languages/${l}${p}`:null};
test('localized editorial projection binds visibility links metadata and document versions',()=>{
 const source=input(),before=structuredClone(source),page=projectLocalizedCustomPage(source,path,context);assert.equal(page.path,'/languages/fr/notre-histoire');assert.equal(page.contentPath,path);assert.equal(page.locale,'fr');assert.equal(page.sections.length,1);assert.equal(page.sections[0].data.body[1].href,'/languages/fr/autre-page');assert.deepEqual(source,before);
 const metadata=localizedCustomPageMetadata(page,newGlobalSettings().seo,'https://site.test');assert.equal(metadata.alternates.canonical,'https://site.test/languages/fr/notre-histoire');assert.equal(metadata.openGraph.locale,'fr');
 assert.throws(()=>projectLocalizedCustomPage(source,path,{...context,resolveLocalizedRoute:undefined}),/verified route/);assert.throws(()=>projectLocalizedCustomPage(source,path,{...context,resolveLocalizedRoute:()=>null}),/unavailable/);
 const scheduled=input();scheduled.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z';assert.throws(()=>projectLocalizedCustomPage(scheduled,path,context),/visible H1/);
 const downloads=input();downloads.payload.composition.sections.push({id:'downloads',kind:'downloads',controls:{label:'Documents'},data:{title:'Documents',items:[{id:'guide',label:'Guide français',document:{recordId:record},versionId:revision}]}});
 assert.throws(()=>projectLocalizedCustomPage(downloads,path,context),/language and version/);
 const doc={recordId:record,versionId:revision,locale:'fr',available:true};assert.equal(projectLocalizedCustomPage(downloads,path,{...context,documents:[doc]}).sections.length,2);
 for(const documents of [[{...doc,locale:'en'}],[{...doc,versionId:record}],[doc,doc],[{...doc,available:false}]])assert.throws(()=>projectLocalizedCustomPage(downloads,path,{...context,documents}),/language and version/);
 const uppercase=structuredClone(downloads),selection=uppercase.payload.composition.sections.at(-1).data.items[0];selection.document.recordId='AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';selection.versionId='BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB';assert.equal(projectLocalizedCustomPage(uppercase,path,{...context,documents:[{recordId:selection.document.recordId.toLowerCase(),versionId:selection.versionId.toLowerCase(),locale:'fr',available:true}]}).sections.length,2);
});
test('localized loader binds exact published page revision and locale SEO without fallback',async()=>{
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};let calls=[],changed=false,missingSeo=false;
 const fetcher=async(url,options)=>{const rpc=String(url).split('/').at(-1),args=JSON.parse(options.body);calls.push(rpc);assert.equal(args.p_locale,'fr');assert.equal(args.p_site,site);assert.equal(options.headers.Authorization,'Bearer anon');if(rpc==='get_public_page')return Response.json(input());if(rpc==='get_public_seo_settings')return Response.json(missingSeo?null:{websiteId:site,recordId:site,revisionId:revision,locale:'fr',seo:newGlobalSettings().seo});assert.equal(rpc,'get_public_localized_routes');assert.deepEqual(args.p_paths,[path,'/autre-page']);return Response.json({websiteId:site,locale:'fr',routes:args.p_paths.map((p,i)=>({path:p,available:true,recordId:i?site:record,revisionId:changed?record:revision}))});};
 assert.equal(await loadLocalizedCustomPage(path,'fr',{},async()=>assert.fail('disabled network')),null);
 const result=await loadLocalizedCustomPage(path,'fr',env,fetcher,now);assert.equal(result.page.path,'/languages/fr/notre-histoire');assert.equal(result.settingsRevisionId,revision);assert.equal(calls.length,3);
 changed=true;await assert.rejects(loadLocalizedCustomPage(path,'fr',env,fetcher,now),/publication changed/);changed=false;missingSeo=true;await assert.rejects(loadLocalizedCustomPage(path,'fr',env,fetcher,now),/SEO defaults/);
});

test('localized page loader verifies published download evidence and keeps exact pinned links',async()=>{
 const value=input();value.payload.composition.sections.push({id:'downloads',kind:'downloads',controls:{label:'Guides'},data:{title:'Guides',items:[{id:'guide',label:'Guide français',document:{recordId:site},versionId:revision}]}});
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_DOCUMENT_DOWNLOADS_ENABLED:'true',CMS_SUPABASE_SERVICE_ROLE_KEY:'server-only-fixture',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};let available=true,wrongRevision=false;
 const fetcher=async(url,options)=>{const rpc=String(url).split('/').at(-1),args=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer anon');assert.equal(args.p_locale,'fr');
  if(rpc==='get_public_page')return Response.json(value);
  if(rpc==='get_public_seo_settings')return Response.json({websiteId:site,recordId:site,revisionId:revision,locale:'fr',seo:newGlobalSettings().seo});
  if(rpc==='get_public_localized_routes')return Response.json({websiteId:site,locale:'fr',routes:args.p_paths.map((p,i)=>({path:p,available:true,recordId:i?site:record,revisionId:revision}))});
  assert.equal(rpc,'get_public_page_download_status');assert.equal(args.p_record,record);assert.equal(args.p_revision,revision);return Response.json({websiteId:site,recordId:record,revisionId:wrongRevision?record:revision,locale:'fr',documents:[{recordId:site,versionId:revision,locale:'fr',available}]});
 };
 assert.equal((await loadLocalizedCustomPage(path,'fr',env,fetcher,now)).page.sections.at(-1).data.items[0].versionId,revision);
 available=false;await assert.rejects(loadLocalizedCustomPage(path,'fr',env,fetcher,now),/language and version/);available=true;wrongRevision=true;await assert.rejects(loadLocalizedCustomPage(path,'fr',env,fetcher,now),/evidence changed/);
 await assert.rejects(loadLocalizedCustomPage(path,'fr',{...env,CMS_DOCUMENT_DOWNLOADS_ENABLED:'false'},fetcher,now),/not configured/);
});
