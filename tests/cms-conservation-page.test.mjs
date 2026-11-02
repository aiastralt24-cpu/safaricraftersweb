import test from 'node:test';import assert from 'node:assert/strict';
import {projectConservationPage,readPublishedConservationPage,conservationPageMetadata} from '../lib/cms/conservation-page.ts';
import {planConservationMigration,conservationMigrationDependencies} from '../lib/cms/conservation-migration.ts';
const id='00000000-0000-4000-8000-000000000001',context={locale:'en',now:new Date('2026-10-23T00:00:00Z')};
const source=()=>({recordId:id,revisionId:id,type:'page',payload:planConservationMigration(conservationMigrationDependencies).previewPayload});
test('conservation projection preserves source groups, ordered rows, headings, images and source attribution',()=>{
 const input=source(),result=projectConservationPage(input,context);
 assert.deepEqual(result.sections,input.payload.composition.sections);assert.equal(result.sections[2].data.metrics.length,8);assert.equal(result.sections[3].data.items.length,4);
 assert.equal(result.path,'/conservation-commitment');assert.deepEqual(result.seo,input.payload.seo);
 const copy=source();copy.payload.composition.sections.reverse();assert.deepEqual(projectConservationPage(copy,context).sections.map(s=>s.id),result.sections.map(s=>s.id).reverse());
 result.sections[2].data.metrics[0].value='Edited';assert.notEqual(input.payload.composition.sections[2].data.metrics[0].value,'Edited');
});
test('conservation rejects unsupported and malformed delivery, including future heading gaps and targeting',()=>{
 for(const mutate of [
  v=>{v.type='homepage';},v=>{v.payload.privateNotes='private';},
  v=>{v.payload.composition.sections[0].controls.headingLevel='h2';},
  v=>{v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z';},
  v=>{v.payload.composition.sections[0].controls.locales=['fr'];},
  v=>{v.payload.composition.sections[2].controls.regions=['india'];},
  v=>{v.payload.composition.sections[2].data.source.href='javascript:alert(1)';},
  v=>{v.payload.composition.sections.push({id:'future',kind:'text',controls:{label:'Future',visibleFrom:'2027-01-01T00:00:00Z'},data:{body:[]}});},
 ]){const input=source();mutate(input);assert.throws(()=>projectConservationPage(input,context));}
 assert.throws(()=>projectConservationPage(source(),{...context,locale:'fr'}));assert.throws(()=>projectConservationPage(source(),{...context,now:new Date(NaN)}));
 const input=source();input.payload.composition.sections[2].controls.visibleFrom='2027-01-01T00:00:00Z';assert.equal(projectConservationPage(input,context).sections.length,4);assert.equal(projectConservationPage(input,{...context,now:new Date('2027-01-01T00:00:00Z')}).sections.length,5);
});
test('conservation reader fixes route and locale and distinguishes absent, malformed and failed delivery',async()=>{
 let args;const config={site:id,readPage:async(...values)=>{args=values;return source();}};
 await readPublishedConservationPage(config,context);assert.deepEqual(args,[id,'/conservation-commitment','en']);
 assert.equal(await readPublishedConservationPage({...config,readPage:async()=>null},context),null);
 await assert.rejects(readPublishedConservationPage(null,context));await assert.rejects(readPublishedConservationPage({...config,site:'invalid'},context));
 await assert.rejects(readPublishedConservationPage({...config,readPage:async()=>({})},context));
 await assert.rejects(readPublishedConservationPage({...config,readPage:async()=>{throw Error('unavailable');}},context),/unavailable/);
 const page=projectConservationPage(source(),context);page.seo.indexing='noindex';
 const metadata=conservationPageMetadata(page,{titleTemplate:'%s | Brand',description:'Default',indexing:'index'},'https://example.test');
 assert.equal(metadata.alternates.canonical,'https://safaricrafters.com/conservation-commitment');assert.equal(metadata.robots.index,false);assert.equal(metadata.description,page.seo.description);
});
