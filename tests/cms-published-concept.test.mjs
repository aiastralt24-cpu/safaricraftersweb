import test from 'node:test';import assert from 'node:assert/strict';
import {parsePublicConceptInput,readPublishedConcept} from '../lib/cms/published-concept.ts';import {projectConceptPage} from '../lib/cms/concept-page.ts';import {planConceptMigration} from '../lib/cms/concept-migration.ts';import {conceptMigrationDependencies} from '../lib/cms/concept-migration-review.ts';import {site,revision,makeConceptMigrationFixture} from './fixtures/cms-concept-migration.mjs';
function fixture(){const payload=structuredClone(planConceptMigration(conceptMigrationDependencies,makeConceptMigrationFixture().mappings).previewPayload);for(const s of payload.composition.sections)if(s.kind==='homepageStory')s.data.statistics.forEach(stat=>delete stat.source);return {websiteId:site,recordId:site,revisionId:revision,type:'page',path:'/concept',locale:'en',payload};}
test('public Concept parsing accepts evidence-free statistics without treating them as publication proof',()=>{const input=fixture(),parsed=parsePublicConceptInput(input,site),result=projectConceptPage(parsed,{locale:'en',now:new Date('2026-10-23')});assert.equal(result.sections.length,10);assert.equal(JSON.stringify(result).includes('"source"'),false);assert.equal(JSON.stringify(input).includes('"source"'),false);assert.throws(()=>parsePublicConceptInput(input,revision),/website mismatch/);input.payload.composition.sections.find(s=>s.kind==='homepageStory').data.statistics[0].source='PRIVATE_EVIDENCE';assert.throws(()=>parsePublicConceptInput(input,site));});
test('Concept reader is opt-in and uses anonymous scoped RPC without draft fallback',async()=>{let calls=0;assert.equal(await readPublishedConcept({},async()=>{calls++;throw Error();}),undefined);assert.equal(calls,0);const env={CMS_CONCEPT_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'PRIVATE_SERVICE'};assert.equal(await readPublishedConcept(env,async(url,options)=>{calls++;assert.ok(String(url).endsWith('/get_public_concept'));assert.equal(options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en'});assert.equal(JSON.stringify(options).includes('PRIVATE_SERVICE'),false);return Response.json(null);}),null);assert.equal(calls,1);});
function transport(change='none'){
 const f=makeConceptMigrationFixture(),home=fixture();let homeReads=0,headerReads=0;const calls=[];
 const fetcher=async(url,options)=>{
  const procedure=String(url).split('/').at(-1),args=JSON.parse(options.body);calls.push(procedure);assert.equal(options.headers.Authorization,'Bearer public-key');assert.equal(args.p_site,site);
  if(procedure==='get_public_concept'){homeReads++;if(homeReads>1&&change==='withdraw-home')return Response.json(null);const copy=structuredClone(home);if(homeReads>1&&change==='replace-home')copy.revisionId='00000000-0000-4000-8000-000000000999';return Response.json(copy);}
  if(procedure==='get_public_seo_settings'){
   headerReads++;const {newGlobalSettings}=await import('../lib/cms/global-settings.ts');const {seo}=newGlobalSettings();seo.description=headerReads>1&&change==='replace-seo'?'Changed SEO':'Published SEO';if(headerReads>1&&change==='withdraw-header')return Response.json(null);
   return Response.json({websiteId:site,recordId:site,revisionId:revision,locale:'en',seo});
  }
  if(procedure==='list_published_journeys')return Response.json(f.records.filter(r=>r.type==='journey').map((r,i)=>({recordId:r.id,revisionId:revision,path:`/journeys/journey-${i}`,modifiedAt:'2026-10-23T00:00:00Z',slug:`journey-${i}`,title:r.payload.title,description:'Published description',region:'India',duration:'5 days',bestMonths:'November',hero:{assetId:'hero',alt:'Forest'}})));
  if(procedure==='list_public_expeditions')return Response.json({websiteId:site,locale:'en',snapshot:'a'.repeat(32),items:[],nextCursor:null});
  if(procedure==='get_public_homepage_guest'){const record=f.records.find(r=>r.id===args.p_record);return Response.json({recordId:record.id,revisionId:revision,name:'Anonymous guest',quote:record.payload.quote,trip:record.payload.trip,category:record.payload.guestType});}
  assert.fail(`Unexpected RPC ${procedure}`);
 };
 return {fetcher,calls};
}
const configured={CMS_CONCEPT_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_HEADER_SETTINGS_ENABLED:'true',CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example',CMS_SUPABASE_ANON_KEY:'public-key'};
test('complete Concept reader assembles ten sections, published dependencies and page-owned navigation',async()=>{
 const f=transport(),value=await readPublishedConcept(configured,f.fetcher,new Date('2026-10-23'));
 assert.equal(value.content.page.sections.length,10);assert.equal(value.content.journeys[0].cards.length,3);assert.equal(value.content.guests[0].cards.length,6);assert.equal(value.content.page.navigation.primary.length,6);assert.equal(f.calls.filter(p=>p==='get_public_concept').length,2);assert.equal(f.calls.filter(p=>p==='get_public_seo_settings').length,2);assert.equal(JSON.stringify(value).includes('PRIVATE_'),false);assert.equal(JSON.stringify(value).includes('"source"'),false);
});
test('Concept/SEO replacement or withdrawal during dependency loading yields no mixed result',async()=>{
 for(const change of ['withdraw-home','replace-home','withdraw-header','replace-seo']){const f=transport(change);await assert.rejects(readPublishedConcept(configured,f.fetcher,new Date('2026-10-23')),/changed while loading|unavailable/);}

});

test('Concept reader rejects another route, language, missing menu and private menu properties',()=>{
 for(const change of [v=>v.path='/',v=>v.locale='fr',v=>v.type='homepage',v=>delete v.payload.navigation,v=>v.payload.navigation.primary[0].privateNote='PRIVATE_EDITORIAL']){const value=fixture();change(value);assert.throws(()=>parsePublicConceptInput(value,site));}
});
test('invalid delivery configuration and time fail before any request',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('Unexpected request');};
 for(const env of [{...configured,CMS_PUBLIC_DELIVERY_ENABLED:'false'},{...configured,CMS_WEBSITE_ID:'bad'},{...configured,CMS_SUPABASE_ANON_KEY:''}])await assert.rejects(readPublishedConcept(env,fetcher),/not configured/);
 await assert.rejects(readPublishedConcept(configured,fetcher,new Date('invalid')),/not configured/);assert.equal(calls,0);
});
