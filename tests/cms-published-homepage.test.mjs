import test from 'node:test';import assert from 'node:assert/strict';
import {parsePublicHomepageInput,readPublishedHomepage} from '../lib/cms/published-homepage.ts';import {projectHomepageSections} from '../lib/cms/homepage-projection.ts';import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';import {site,revision,makeHomepageMigrationFixture} from './fixtures/cms-homepage-migration.mjs';
function fixture(){const payload=structuredClone(planHomepageMigration(homepageMigrationDependencies,makeHomepageMigrationFixture().mappings).previewPayload);for(const s of payload.composition.sections)if(s.kind==='homepageStory')s.data.statistics.forEach(stat=>delete stat.source);return {websiteId:site,recordId:site,revisionId:revision,type:'homepage',payload};}
test('public homepage parsing accepts evidence-free statistics without treating them as publication proof',()=>{const input=fixture(),parsed=parsePublicHomepageInput(input,site),result=projectHomepageSections(parsed,{locale:'en',now:new Date('2026-10-23')});assert.equal(result.sections.length,10);assert.equal(JSON.stringify(result).includes('"source"'),false);assert.equal(JSON.stringify(input).includes('"source"'),false);assert.throws(()=>parsePublicHomepageInput(input,revision),/website mismatch/);input.payload.composition.sections.find(s=>s.kind==='homepageStory').data.statistics[0].source='PRIVATE_EVIDENCE';assert.throws(()=>parsePublicHomepageInput(input,site));});
test('homepage reader is opt-in and uses anonymous scoped RPC without draft fallback',async()=>{let calls=0;assert.equal(await readPublishedHomepage({},async()=>{calls++;throw Error();}),undefined);assert.equal(calls,0);const env={CMS_HOMEPAGE_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'PRIVATE_SERVICE'};await assert.rejects(readPublishedHomepage(env,async(url,options)=>{calls++;assert.ok(String(url).endsWith('/get_public_homepage'));assert.equal(options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en'});assert.equal(JSON.stringify(options).includes('PRIVATE_SERVICE'),false);return Response.json(null);}),/unavailable/);assert.equal(calls,1);});
function transport(change='none'){
 const f=makeHomepageMigrationFixture(),home=fixture();let homeReads=0,headerReads=0;const calls=[];
 const fetcher=async(url,options)=>{
  const procedure=String(url).split('/').at(-1),args=JSON.parse(options.body);calls.push(procedure);assert.equal(options.headers.Authorization,'Bearer public-key');assert.equal(args.p_site,site);
  if(procedure==='get_public_homepage'){homeReads++;if(homeReads>1&&change==='withdraw-home')return Response.json(null);const copy=structuredClone(home);if(homeReads>1&&change==='replace-home')copy.revisionId='00000000-0000-4000-8000-000000000999';return Response.json(copy);}
  if(procedure==='get_public_header'){
   headerReads++;const {newGlobalSettings}=await import('../lib/cms/global-settings.ts');const payload=newGlobalSettings();payload.header.mainMenu={recordId:revision};payload.seo.description='Published homepage SEO defaults';if(headerReads>1&&change==='replace-seo')payload.seo.description='Changed SEO defaults';
   if(headerReads>1&&change==='withdraw-header')return Response.json(null);
   return Response.json({settings:{websiteId:site,recordId:site,revisionId:revision,locale:'en',payload},menus:{mainMenu:{websiteId:site,recordId:revision,revisionId:headerReads>1&&change==='replace-menu'?'00000000-0000-4000-8000-000000000999':revision,locale:'en',payload:{schemaVersion:1,title:'Main navigation',items:[{id:'contact',parentId:null,label:'Contact',target:{kind:'url',href:'/contact'},visibility:{visible:true}}]},references:[]},utilityMenu:null,mobileMenu:null},featured:[]});
  }
  if(procedure==='list_published_journeys')return Response.json(f.records.filter(r=>r.type==='journey').map((r,i)=>({recordId:r.id,revisionId:revision,path:`/journeys/journey-${i}`,modifiedAt:'2026-10-23T00:00:00Z',slug:`journey-${i}`,title:r.payload.title,description:'Published description',region:'India',duration:'5 days',bestMonths:'November',hero:{assetId:'hero',alt:'Forest'}})));
  if(procedure==='list_public_expeditions')return Response.json({websiteId:site,locale:'en',snapshot:'a'.repeat(32),items:[],nextCursor:null});
  if(procedure==='get_public_homepage_guest'){const record=f.records.find(r=>r.id===args.p_record);return Response.json({recordId:record.id,revisionId:revision,name:'Anonymous guest',quote:record.payload.quote,trip:record.payload.trip,category:record.payload.guestType});}
  assert.fail(`Unexpected RPC ${procedure}`);
 };
 return {fetcher,calls};
}
const configured={CMS_HOMEPAGE_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_HEADER_SETTINGS_ENABLED:'true',CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example',CMS_SUPABASE_ANON_KEY:'public-key'};
test('complete homepage reader assembles ten sections, published dependencies and configured navigation',async()=>{
 const f=transport(),value=await readPublishedHomepage(configured,f.fetcher,new Date('2026-10-23'));
 assert.equal(value.content.page.sections.length,10);assert.equal(value.content.journeys[0].cards.length,3);assert.equal(value.content.guests[0].cards.length,6);assert.equal(value.header.main.items[0].link.href,'/contact');assert.equal(f.calls.filter(p=>p==='get_public_homepage').length,2);assert.equal(f.calls.filter(p=>p==='get_public_header').length,2);assert.equal(JSON.stringify(value).includes('PRIVATE_'),false);assert.equal(JSON.stringify(value).includes('"source"'),false);
});
test('homepage/header replacement or withdrawal during dependency loading yields no mixed result',async()=>{
 for(const change of ['withdraw-home','replace-home','withdraw-header','replace-menu','replace-seo']){const f=transport(change);await assert.rejects(readPublishedHomepage(configured,f.fetcher,new Date('2026-10-23')),/changed while loading|unavailable/);}
 const f=transport();await assert.rejects(readPublishedHomepage({...configured,CMS_HEADER_SETTINGS_ENABLED:'false'},f.fetcher,new Date('2026-10-23')),/requires configured header/);
});

test('homepage metadata inherits the same published settings snapshot and honors page overrides',async()=>{
 const {homepageMetadata}=await import('../lib/cms/homepage-projection.ts');
 const f=transport(),value=await readPublishedHomepage(configured,f.fetcher,new Date('2026-10-23'));
 assert.equal(value.seoDefaults.description,'Published homepage SEO defaults');
 const page=structuredClone(value.content.page);page.seo.title='Client homepage';page.seo.description='Client description';page.seo.canonical='https://safaricrafters.com/';page.seo.indexing='noindex';page.seo.socialTitle='Shared title';page.seo.socialImage={assetId:'sharing-image',alt:'A forest canopy',decorative:false};
 const metadata=homepageMetadata(page,value.seoDefaults);
 assert.equal(metadata.description,'Client description');assert.equal(metadata.alternates.canonical,'https://safaricrafters.com/');assert.equal(metadata.robots.index,false);assert.equal(metadata.openGraph.title,'Shared title');assert.equal(metadata.openGraph.images[0].alt,'A forest canopy');assert.match(metadata.openGraph.images[0].url,/sharing-image/);
 page.seo.description='';assert.equal(homepageMetadata(page,value.seoDefaults).description,'Published homepage SEO defaults');
 assert.equal(f.calls.some(p=>p==='get_public_seo_settings'),false);
});
