import test from 'node:test';
import assert from 'node:assert/strict';
import {projectExpeditionPage,readPublishedExpeditionPage,expeditionPageMetadata} from '../lib/cms/expedition-page.ts';
import {createExpeditionDirectorySection} from '../lib/cms/section-drafts.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const id='00000000-0000-4000-8000-000000000001';
const context={locale:'en',now:new Date('2026-10-22T12:00:00Z')};
const source=()=>({recordId:id,revisionId:id,type:'page',payload:{seo:newPageSeo(),composition:{schemaVersion:1,title:'Expeditions',sections:[{id:'hero',kind:'hero',controls:{label:'Hero',headingLevel:'h1'},data:{eyebrow:'The field team',title:'Meet your expeditions',copy:'People who know the landscape.',desktop:{assetId:'desktop',alt:'Field team',credit:'Photographer'},mobile:{assetId:'mobile',alt:'Guide portrait'},buttons:[{label:'Plan a journey',href:'/plan'}]}},createExpeditionDirectorySection('directory'),{id:'closing',kind:'cta',controls:{label:'Closing'},data:{title:'Begin planning',copy:'Talk to the team.',buttons:[{label:'Contact',href:'/contact'}]}}]}}});
test('expedition page preserves ordered composition, independent hero images and page SEO',()=>{
 const input=source();input.payload.seo={...newPageSeo(),title:'Expert guides',description:'Meet our field expeditions',indexing:'noindex',socialTitle:'Meet the team',socialImage:{assetId:'social',alt:'Team'}};
 const result=projectExpeditionPage(input,context);assert.deepEqual(result.sections.map(s=>s.kind),['hero','expeditionDirectory','cta']);assert.equal(result.sections[0].data.desktop.assetId,'desktop');assert.equal(result.sections[0].data.mobile.assetId,'mobile');assert.equal(result.sections[0].data.desktop.credit,'Photographer');
 const metadata=expeditionPageMetadata(result,{titleTemplate:'%s | Brand',description:'Default',indexing:'index'},'https://example.test');
 assert.deepEqual(metadata.title,{absolute:'Expert guides'});assert.equal(metadata.description,'Meet our field expeditions');assert.equal(metadata.robots.index,false);assert.equal(metadata.openGraph.title,'Meet the team');assert.equal(metadata.openGraph.images[0].url,'https://example.test/api/cms/published/media/social');
 assert.equal(metadata.alternates.canonical,'https://example.test/photo-expeditions');
});
test('expedition page rejects unavailable kinds and controls even when scheduled for the future',()=>{
 for(const mutate of [
  value=>{value.type='homepage';},value=>{value.payload.privateNotes='Private';},
  value=>{value.payload.composition.sections[0].controls.headingLevel='h2';},
  value=>{value.payload.composition.sections[1].controls.visible=false;},
  value=>{value.payload.composition.sections[1].controls.animation='reveal';},
  value=>{value.payload.composition.sections[1].controls.regions=['india'];},
  value=>{value.payload.composition.sections.push({...createExpeditionDirectorySection('second')});},
  value=>{value.payload.composition.sections.push({id:'later',kind:'gallery',controls:{label:'Later',visibleFrom:'2027-01-01T00:00:00Z'},data:{images:[{id:'one',image:{assetId:'image',alt:'Forest'}}]}});},
 ]){const input=source();mutate(input);assert.throws(()=>projectExpeditionPage(input,context));}
 assert.throws(()=>projectExpeditionPage(source(),{...context,locale:'fr'}));assert.throws(()=>projectExpeditionPage(source(),{...context,now:new Date('invalid')}));
 const hidden=source();hidden.payload.composition.sections.push({id:'hidden',kind:'gallery',controls:{label:'Hidden',visible:false},data:{images:[{id:'one',image:{assetId:'image',alt:'Forest'}}]}});assert.equal(projectExpeditionPage(hidden,context).sections.length,3);
});
test('expedition page reader fixes its route, separates missing and failed data, and skips inactive directory reads',async()=>{
 const input=source();let pageArgs,directoryCalls=0;
 const config={site:id,readPage:async(...args)=>{pageArgs=args;return input;},readDirectory:async()=>{directoryCalls++;return {websiteId:id,locale:'en',items:[],snapshot:'a'.repeat(32),nextCursor:null};}};
 const result=await readPublishedExpeditionPage(config,context);assert.deepEqual(pageArgs,[id,'/photo-expeditions','en']);assert.deepEqual(result.expeditions,[]);assert.equal(directoryCalls,1);
 input.payload.composition.sections[1].controls.visibleFrom='2026-10-23T00:00:00Z';const before=await readPublishedExpeditionPage(config,context);assert.equal(before.page.sections.some(s=>s.kind==='expeditionDirectory'),false);assert.equal(directoryCalls,1);
 await readPublishedExpeditionPage(config,{...context,now:new Date('2026-10-23T00:00:00Z')});assert.equal(directoryCalls,2);
 assert.equal(await readPublishedExpeditionPage({...config,readPage:async()=>null},context),null);
 await assert.rejects(readPublishedExpeditionPage(null,context));
 await assert.rejects(readPublishedExpeditionPage({...config,readPage:async()=>source(),readDirectory:async()=>{throw Error('unavailable');}},context),/unavailable/);
 input.payload.composition.sections[0].controls.visibleUntil=context.now.toISOString();assert.throws(()=>projectExpeditionPage(input,context),/H1/);
});

test('expedition directory controls preserve editable labels and reject empty or oversized interface text',async()=>{
 const {expeditionDirectorySectionSchema,newExpeditionDirectoryData}=await import('../lib/cms/expedition-directory-section.ts');
 const data=newExpeditionDirectoryData();assert.equal(expeditionDirectorySectionSchema.safeParse(data).success,true);
 for(const field of ['emptyMessage','noDeparturesMessage','viewLabel','geographyLabel','allGeographiesLabel','monthLabel','allMonthsLabel','clearFiltersLabel']){assert.equal(expeditionDirectorySectionSchema.safeParse({...data,[field]:''}).success,false);assert.equal(expeditionDirectorySectionSchema.safeParse({...data,[field]:'x'.repeat(2001)}).success,false);}
 for(const display of ['cards','calendar','both'])assert.equal(expeditionDirectorySectionSchema.safeParse({...data,display}).success,true);
 assert.equal(expeditionDirectorySectionSchema.safeParse({...data,display:'unsupported'}).success,false);
 const input=source();input.payload.composition.sections[1].data={...data,title:'Client heading',viewLabel:'Explore the tour',emptyMessage:'Ask our team for upcoming tours.'};const page=projectExpeditionPage(input,context);assert.equal(page.sections[1].data.viewLabel,'Explore the tour');assert.equal(page.sections[1].data.emptyMessage,'Ask our team for upcoming tours.');
});
