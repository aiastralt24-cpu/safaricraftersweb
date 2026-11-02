import test from 'node:test';import assert from 'node:assert/strict';
import {projectCustomPage,customPageMetadata} from '../lib/cms/custom-page.ts';
import {loadCustomPageRoute} from '../lib/cms/custom-page-runtime.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const site='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002',path='/travel-resources/packing-list';
const input=()=>({recordId:site,revisionId:revision,type:'page',payload:{composition:{schemaVersion:1,title:'Packing list',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Before your journey',body:[{kind:'paragraph',text:'Ask your guide about seasonal requirements.'}]}},{id:'downloads',kind:'downloads',controls:{label:'Guides',headingLevel:'h2'},data:{title:'Travel documents',items:[{id:'guide',label:'Travel guide',document:{recordId:site},versionId:revision}]}}]}}});
const context={locale:'en',now:new Date('2026-10-23')};
const env={CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'anon'};
test('custom projection binds path, preserves reviewed downloads and applies layout/schedule constraints',()=>{
 const page=projectCustomPage(input(),path,context);assert.equal(page.path,path);assert.equal(page.sections[1].data.items[0].versionId,revision);assert.equal(customPageMetadata(page,newGlobalSettings().seo).alternates.canonical,'https://safaricrafters.com'+path);
 for(const bad of ['/cms','/about','/journeys/new','/a%2fb'])assert.throws(()=>projectCustomPage(input(),bad,context));
 for(const change of [v=>v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z',v=>v.payload.composition.sections[1].controls.headingLevel='h1',v=>v.payload.composition.sections[0].controls.regions=['india'],v=>v.payload.private='secret']){const value=input();change(value);assert.throws(()=>projectCustomPage(value,path,context));}
 assert.throws(()=>projectCustomPage(input(),path,{...context,locale:'fr'}));
});
test('custom runtime reads anonymous published data only and fails closed for missing settings or bad content',async()=>{
 const calls=[];let page=input(),settings={websiteId:site,recordId:site,revisionId:revision,locale:'en',seo:newGlobalSettings().seo};
 const fetcher=async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1);calls.push(name);assert.equal(options.headers.Authorization,'Bearer anon');assert.equal(options.cache,'no-store');const args=JSON.parse(options.body);assert.equal(args.p_site,site);if(name==='get_public_page')assert.equal(args.p_path,path);return Response.json(name==='get_public_page'?page:settings);};
 assert.equal((await loadCustomPageRoute(path,env,fetcher,context.now)).page.path,path);assert.deepEqual(calls,['get_public_page','get_public_seo_settings']);calls.length=0;
 assert.equal(await loadCustomPageRoute('/admin',env,fetcher),null);assert.equal(await loadCustomPageRoute(path,{...env,CMS_CUSTOM_PAGES_ENABLED:'false'},fetcher),null);assert.deepEqual(calls,[]);
 page=null;assert.equal(await loadCustomPageRoute(path,env,fetcher),null);assert.deepEqual(calls,['get_public_page']);page=input();settings=null;await assert.rejects(loadCustomPageRoute(path,env,fetcher),/SEO defaults/);
 await assert.rejects(loadCustomPageRoute(path,{...env,CMS_PUBLIC_DELIVERY_ENABLED:'false'},fetcher),/not configured/);
});
test('trusted custom validation rejects reserved routes, unsupported sections and missing document evidence',async()=>{
 const {validateStoredContent}=await import('../lib/cms/content-validation.ts');
 const record={type:'page',path,locale:'en',payload:input().payload,downloadStatus:[{recordId:site,versionId:revision,available:true}]};
 assert.equal(validateStoredContent(record).contentChecksPass,true);
 assert.equal(validateStoredContent({...record,downloadStatus:undefined}).contentChecksPass,false);
 for(const route of ['/admin/custom','/store/custom','/api/custom','/tours/custom']){const checked=validateStoredContent({...record,path:route});assert.equal(checked.contentChecksPass,false);assert.ok(checked.findings.some(f=>f.code==='publication_not_ready'));}
 const value=structuredClone(record);value.payload.composition.sections.push({id:'faq',kind:'faq',controls:{label:'FAQ'},data:{title:'Questions',items:[]}});assert.equal(validateStoredContent(value).contentChecksPass,false);
});

test('English localized delivery binds selector settings to the same published SEO revision',async()=>{
 const payload=newGlobalSettings();payload.header.languageSelector=true;payload.header.languageSelectorLabel='Languages';let stale=false;
 const fetcher=async(url)=>{const name=String(url).split('/').at(-1);if(name==='get_public_page')return Response.json(input());if(name==='get_public_seo_settings')return Response.json({websiteId:site,recordId:site,revisionId:revision,locale:'en',seo:payload.seo});assert.equal(name,'get_public_settings');return Response.json({websiteId:site,recordId:site,revisionId:stale?site:revision,locale:'en',payload});};
 const enabled={...env,CMS_LOCALIZED_PAGES_ENABLED:'true'};assert.equal((await loadCustomPageRoute(path,enabled,fetcher,context.now)).selectorSettings.languageSelectorLabel,'Languages');stale=true;await assert.rejects(()=>loadCustomPageRoute(path,enabled,fetcher,context.now),/publication changed/);
});

test('custom pages resolve ordered reusable FAQs and omit withdrawn answers without draft fallback',async()=>{
 const faqId='00000000-0000-4000-8000-000000000003',page=input();page.payload.composition.sections.push({id:'answers',kind:'reusableFaq',controls:{label:'Reusable answers',headingLevel:'h2'},data:{title:'Common questions',records:[{recordId:faqId}]}});let withdrawn=false;
 const fetcher=async(url,options)=>{const name=String(url).split('/').at(-1);if(name==='get_public_page')return Response.json(page);if(name==='get_public_seo_settings')return Response.json({websiteId:site,recordId:site,revisionId:revision,locale:'en',seo:newGlobalSettings().seo});assert.equal(name,'get_public_faq');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_record:faqId,p_locale:'en'});return Response.json(withdrawn?null:{recordId:faqId,revisionId:revision,locale:'en',question:'Published question',answer:[{kind:'paragraph',text:'Published answer'}]});};
 const loaded=await loadCustomPageRoute(path,env,fetcher,context.now);assert.equal(loaded.page.sections.at(-1).kind,'reusableFaq');assert.equal(loaded.faqAnswers.answers[0].question,'Published question');withdrawn=true;assert.deepEqual((await loadCustomPageRoute(path,env,fetcher,context.now)).faqAnswers.answers,[]);
 page.payload.composition.sections.at(-1).data.records.push({recordId:faqId});assert.throws(()=>projectCustomPage(page,path,context));
});

test('custom leadership sections resolve published profiles, omit withdrawals and require explicit rollout',async()=>{
 const {newLeadership}=await import('../lib/cms/leadership.ts');
 const {pageLeadershipFindings}=await import('../lib/cms/page-leadership-validation.ts');
 const profileId='00000000-0000-4000-8000-000000000003',page=input();
 page.payload.composition.sections=page.payload.composition.sections.slice(0,1);
 page.payload.composition.sections.push({id:'leaders',kind:'reusableLeadership',controls:{label:'Leadership',headingLevel:'h2'},data:{title:'Our leadership',records:[{recordId:profileId}]}});
 const {internalNotes,relationships,...payload}={...newLeadership(),slug:'example',title:'Example leader',role:'Director',summary:'Published summary',body:[{id:'intro',kind:'paragraph',text:'Biography'}]};
 let withdrawn=false;
 const fetcher=async(url,options)=>{const name=String(url).split('/').at(-1);
 if(name==='get_public_page')return Response.json(page);
 if(name==='get_public_seo_settings')return Response.json({websiteId:site,recordId:site,revisionId:revision,locale:'en',seo:newGlobalSettings().seo});
 assert.equal(name,'get_public_leadership_reference');assert.equal(options.headers.Authorization,'Bearer anon');
 return Response.json(withdrawn?null:{recordId:profileId,revisionId:revision,type:'leadership',path:'/leadership/example',locale:'en',payload,related:[]});};
 await assert.rejects(()=>loadCustomPageRoute(path,env,fetcher,context.now),/not configured/);
 const enabled={...env,CMS_LEADERSHIP_DELIVERY_ENABLED:'true'};
 assert.equal((await loadCustomPageRoute(path,enabled,fetcher,context.now)).leadershipProfiles.leaders[0].content.summary,'Published summary');
 withdrawn=true;assert.deepEqual((await loadCustomPageRoute(path,enabled,fetcher,context.now)).leadershipProfiles.leaders,[]);
 const target={site,record:site,revision,payload:page.payload},evidence={websiteId:site,recordId:site,revisionId:revision,references:[{recordId:profileId,available:true}]};
 assert.deepEqual(pageLeadershipFindings(target,evidence),[]);
 for(const bad of [undefined,{...evidence,revisionId:site},{...evidence,references:[]},{...evidence,references:[{recordId:profileId,available:false}]}])assert.equal(pageLeadershipFindings(target,bad)[0].code,'page_leadership_unavailable');
 const {projectAboutPage}=await import('../lib/cms/about-page.ts');assert.equal(projectAboutPage(page,context).sections.at(-1).kind,"reusableLeadership");
 page.payload.composition.sections.at(-1).controls.headingLevel='h1';assert.throws(()=>projectCustomPage(page,path,context));page.payload.composition.sections.at(-1).controls.headingLevel='h2';
 page.payload.composition.sections.at(-1).data.records.push({recordId:profileId});assert.throws(()=>projectCustomPage(page,path,context));
});
