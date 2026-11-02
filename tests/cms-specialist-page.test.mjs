import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSpecialistPage,readPublishedSpecialistPage,specialistPageMetadata} from '../lib/cms/specialist-page.ts';
import {createSpecialistDirectorySection} from '../lib/cms/section-drafts.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const id='00000000-0000-4000-8000-000000000001';
const context={locale:'en',now:new Date('2026-10-22T12:00:00Z')};
const source=()=>({recordId:id,revisionId:id,type:'page',payload:{seo:newPageSeo(),composition:{schemaVersion:1,title:'Specialists',sections:[{id:'hero',kind:'hero',controls:{label:'Hero',headingLevel:'h1'},data:{eyebrow:'The field team',title:'Meet your specialists',copy:'People who know the landscape.',desktop:{assetId:'desktop',alt:'Field team',credit:'Photographer'},mobile:{assetId:'mobile',alt:'Guide portrait'},buttons:[{label:'Plan a journey',href:'/plan'}]}},createSpecialistDirectorySection('directory'),{id:'closing',kind:'cta',controls:{label:'Closing'},data:{title:'Begin planning',copy:'Talk to the team.',buttons:[{label:'Contact',href:'/contact'}]}}]}}});
test('specialist page preserves ordered composition, independent hero images and page SEO',()=>{
 const input=source();input.payload.seo={...newPageSeo(),title:'Expert guides',description:'Meet our field specialists',indexing:'noindex',socialTitle:'Meet the team',socialImage:{assetId:'social',alt:'Team'}};
 const result=projectSpecialistPage(input,context);assert.deepEqual(result.sections.map(s=>s.kind),['hero','specialistDirectory','cta']);assert.equal(result.sections[0].data.desktop.assetId,'desktop');assert.equal(result.sections[0].data.mobile.assetId,'mobile');assert.equal(result.sections[0].data.desktop.credit,'Photographer');
 const metadata=specialistPageMetadata(result,{titleTemplate:'%s | Brand',description:'Default',indexing:'index'},'https://example.test');
 assert.deepEqual(metadata.title,{absolute:'Expert guides'});assert.equal(metadata.description,'Meet our field specialists');assert.equal(metadata.robots.index,false);assert.equal(metadata.openGraph.title,'Meet the team');assert.equal(metadata.openGraph.images[0].url,'https://example.test/api/cms/published/media/social');
 assert.equal(metadata.alternates.canonical,'https://example.test/specialists');
});
test('specialist page rejects unavailable kinds and controls even when scheduled for the future',()=>{
 for(const mutate of [
  value=>{value.type='homepage';},value=>{value.payload.privateNotes='Private';},
  value=>{value.payload.composition.sections[0].controls.headingLevel='h2';},
  value=>{value.payload.composition.sections[1].controls.visible=false;},
  value=>{value.payload.composition.sections[1].controls.animation='reveal';},
  value=>{value.payload.composition.sections[1].controls.regions=['india'];},
  value=>{value.payload.composition.sections.push({...createSpecialistDirectorySection('second')});},
  value=>{value.payload.composition.sections.push({id:'later',kind:'gallery',controls:{label:'Later',visibleFrom:'2027-01-01T00:00:00Z'},data:{images:[{id:'one',image:{assetId:'image',alt:'Forest'}}]}});},
 ]){const input=source();mutate(input);assert.throws(()=>projectSpecialistPage(input,context));}
 assert.throws(()=>projectSpecialistPage(source(),{...context,locale:'fr'}));assert.throws(()=>projectSpecialistPage(source(),{...context,now:new Date('invalid')}));
 const hidden=source();hidden.payload.composition.sections.push({id:'hidden',kind:'gallery',controls:{label:'Hidden',visible:false},data:{images:[{id:'one',image:{assetId:'image',alt:'Forest'}}]}});assert.equal(projectSpecialistPage(hidden,context).sections.length,3);
});
test('specialist page reader fixes its route, separates missing and failed data, and skips inactive directory reads',async()=>{
 const input=source();let pageArgs,directoryCalls=0;
 const config={site:id,readPage:async(...args)=>{pageArgs=args;return input;},readDirectory:async()=>{directoryCalls++;return {websiteId:id,locale:'en',items:[],nextCursor:null};}};
 const result=await readPublishedSpecialistPage(config,context);assert.deepEqual(pageArgs,[id,'/specialists','en']);assert.deepEqual(result.profiles,[]);assert.equal(directoryCalls,1);
 input.payload.composition.sections[1].controls.visibleFrom='2026-10-23T00:00:00Z';const before=await readPublishedSpecialistPage(config,context);assert.equal(before.page.sections.some(s=>s.kind==='specialistDirectory'),false);assert.equal(directoryCalls,1);
 await readPublishedSpecialistPage(config,{...context,now:new Date('2026-10-23T00:00:00Z')});assert.equal(directoryCalls,2);
 assert.equal(await readPublishedSpecialistPage({...config,readPage:async()=>null},context),null);
 await assert.rejects(readPublishedSpecialistPage(null,context));
 await assert.rejects(readPublishedSpecialistPage({...config,readPage:async()=>source(),readDirectory:async()=>{throw Error('unavailable');}},context),/unavailable/);
 input.payload.composition.sections[0].controls.visibleUntil=context.now.toISOString();assert.throws(()=>projectSpecialistPage(input,context),/H1/);
});
