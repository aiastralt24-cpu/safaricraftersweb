import test from 'node:test';
import assert from 'node:assert/strict';
import {validateComposition,editComposition,sectionIsVisible,sectionDataSchemas} from '../lib/cms/composition.ts';
const section=(id='intro')=>({id,kind:'text',controls:{label:'Introduction'},data:{title:'A private journey',body:[{kind:'paragraph',text:'Original editorial copy.'}]}});
const page=()=>({schemaVersion:1,title:'Journey',sections:[section('intro'),section('details')]});
test('specialist directory labels round-trip with supported publishable hero composition',async()=>{
 const {createSpecialistDirectorySection}=await import('../lib/cms/section-drafts.ts');
 const {validateStoredContent}=await import('../lib/cms/content-validation.ts');
 const directory=createSpecialistDirectorySection('specialists');
 directory.data={title:'Meet the field team',relatedHeading:'Explore their journeys',emptyMessage:'New profiles are being prepared.'};
 const value={schemaVersion:1,title:'Specialists',sections:[{id:'hero',kind:'hero',controls:{label:'Page hero',headingLevel:'h1'},data:{title:'Meet your guides',copy:'Specialists in the field',desktop:{assetId:'portrait',alt:'Guide in the field'},mobile:{assetId:'mobile',alt:'Guide portrait'},buttons:[]}},directory]};
 const saved=validateComposition(JSON.parse(JSON.stringify(value)));assert.equal(saved.valid,true);assert.deepEqual(saved.page.sections[1].data,directory.data);
 const duplicated=editComposition(saved.page,{type:'duplicate',id:'specialists',newId:'hidden-directory'});assert.equal(duplicated.sections[2].controls.visible,false);
 const advisory=validateStoredContent({type:'page',path:'/specialists',payload:{composition:saved.page}},[{assetId:'portrait',available:true},{assetId:'mobile',available:true}]);assert.equal(advisory.contentChecksPass,true);assert.equal(advisory.findings.some(f=>f.code==='publication_not_ready'),false);
 for(const [key,bad] of [['relatedHeading',' '],['emptyMessage',''],['relatedHeading','x'.repeat(201)],['emptyMessage','x'.repeat(2001)]]){const changed=structuredClone(value);changed.sections[1].data[key]=bad;assert.equal(validateComposition(changed).valid,false);}
 const unknown=structuredClone(value);unknown.sections[1].data.rawHtml='<script>bad</script>';assert.equal(validateComposition(unknown).valid,false);
});
test('approved contracts cover the 20 initial PRD families plus specialist and expedition directories and homepage hero/story/concierge/journey types/partners/corporate/aviation/curated journeys/departures/guest notes and Bespoke/MICE/Kenya/Tanzania sections and reusable FAQs/leadership without arbitrary CSS',()=>{
 assert.equal(Object.keys(sectionDataSchemas).length,79);assert.equal(validateComposition(page()).valid,true);
 const input=page();input.sections[0].controls.css='position:fixed';assert.equal(validateComposition(input).valid,false);
 input.sections[0]=section();input.sections[0].kind='script';assert.equal(validateComposition(input).valid,false);
});
test('reordering is immutable and preserves content and stable identity',()=>{
 const input=page();const result=editComposition(input,{type:'move',id:'details',to:0});assert.deepEqual(result.sections.map(s=>s.id),['details','intro']);assert.deepEqual(input.sections.map(s=>s.id),['intro','details']);assert.equal(result.sections[0].data.body[0].text,'Original editorial copy.');
 assert.throws(()=>editComposition(input,{type:'move',id:'details',to:3}),/position/);
});
test('duplicates start hidden with independent data and no anchor collisions',()=>{
 const input=page();input.sections[0].controls.anchor='introduction';const result=editComposition(input,{type:'duplicate',id:'intro',newId:'intro-copy'});
 assert.equal(result.sections[1].controls.visible,false);assert.equal(result.sections[1].controls.anchor,undefined);result.sections[1].data.body[0].text='Changed copy';assert.equal(result.sections[0].data.body[0].text,'Original editorial copy.');
 assert.throws(()=>editComposition(input,{type:'duplicate',id:'intro',newId:'details'}),/unique/);
});
test('insert, replace and remove enforce stable identity and validate the resulting page',()=>{
 const inserted=editComposition(page(),{type:'insert',section:section('third'),at:2});assert.equal(inserted.sections.length,3);
 assert.throws(()=>editComposition(inserted,{type:'replace',id:'third',section:section('wrong')}),/identity/);
 const changed=section('third');changed.data.title='Changed';const replaced=editComposition(inserted,{type:'replace',id:'third',section:changed});assert.equal(replaced.sections[2].data.title,'Changed');assert.equal(editComposition(replaced,{type:'remove',id:'third'}).sections.length,2);
});
test('schedules use explicit offsets, exclusive end times and explicit audience context',()=>{
 const input=page();input.sections[0].controls={label:'Scheduled',visibleFrom:'2026-10-22T10:00:00+05:30',visibleUntil:'2026-10-22T11:00:00+05:30',locales:['en'],regions:['india']};
 const parsed=validateComposition(input).page;const item=parsed.sections[0];
 assert.equal(sectionIsVisible(item,{now:new Date('2026-10-22T04:30:00Z'),locale:'en',region:'india'}),true);
 assert.equal(sectionIsVisible(item,{now:new Date('2026-10-22T05:30:00Z'),locale:'en',region:'india'}),false);
 assert.equal(sectionIsVisible(item,{now:new Date('2026-10-22T04:30:00Z'),locale:'en'}),false);
 input.sections[0].controls.visibleUntil='2026-10-22T09:00:00+05:30';assert.equal(validateComposition(input).valid,false);
});
test('images require accessible text and desktop/mobile assets stay independent',()=>{
 const input=page();input.sections=[{id:'hero',kind:'hero',controls:{label:'Hero',headingLevel:'h1'},data:{title:'Forest journeys',copy:'Private journeys',desktop:{assetId:'desktop',alt:'Forest at dawn'},mobile:{assetId:'mobile',alt:'Forest canopy'},buttons:[]}}];
 const result=validateComposition(input);assert.equal(result.valid,true);assert.notEqual(result.page.sections[0].data.desktop.assetId,result.page.sections[0].data.mobile.assetId);
 input.sections[0].data.mobile.alt='';assert.equal(validateComposition(input).valid,false);
});
test('unsafe links, duplicate child IDs and missing default tabs are rejected',()=>{
 for(const href of ['javascript:alert(1)','//evil.test','https://user:pass@evil.test','/\\evil.test']){
 const input=page();input.sections[0]={id:'cta',kind:'cta',controls:{label:'CTA'},data:{title:'Enquire',copy:'Plan your journey',buttons:[{label:'Enquire',href}]}};assert.equal(validateComposition(input).valid,false);
 }
 const input=page();input.sections[0]={id:'tabs',kind:'tabs',controls:{label:'Tabs'},data:{title:'Journey details',defaultTabId:'missing',items:[{id:'one',label:'One',body:[]}]}};assert.equal(validateComposition(input).valid,false);
 input.sections[0].data.defaultTabId='one';input.sections[0].data.items.push({id:'one',label:'Two',body:[]});assert.equal(validateComposition(input).valid,false);
});
test('duplicate anchors and multiple visible top-level headings are rejected',()=>{
 const input=page();input.sections.forEach(s=>s.controls.anchor='same');assert.equal(validateComposition(input).valid,false);
 input.sections.forEach(s=>{delete s.controls.anchor;s.controls.headingLevel='h1';});assert.equal(validateComposition(input).valid,false);
});

test('incomplete image drafts remain movable/removable but cannot pass save validation',async()=>{
 const {createImageSectionDraft}=await import('../lib/cms/section-drafts.ts');
 const {editCompositionDraft}=await import('../lib/cms/composition.ts');
 for(const kind of ['hero','imageText','gallery']){
  const draft=createImageSectionDraft(kind,'image-section','gallery-entry');
  const input={schemaVersion:1,title:'Test',sections:[draft]};
  assert.equal(validateComposition(input).valid,false);
  const copy=editCompositionDraft(input,{type:'duplicate',id:'image-section',newId:'copy'});
  assert.equal(copy.sections[1].controls.visible,false);assert.equal(input.sections.length,1);
  assert.equal(editCompositionDraft(copy,{type:'move',id:'copy',to:0}).sections[0].id,'copy');
  assert.equal(editCompositionDraft(input,{type:'remove',id:'image-section'}).sections.length,0);
  assert.throws(()=>editComposition(input,{type:'duplicate',id:'image-section',newId:'strict'}),/Repair/);
  assert.throws(()=>editCompositionDraft(input,{type:'duplicate',id:'image-section',newId:'image-section'}),/unique/);
 }
});

test('collection section drafts use schema-compatible data and independent item identities',async()=>{
 const {createCollectionSectionDraft}=await import('../lib/cms/section-drafts.ts');
 for(const kind of ['cards','statistics','timeline','logos']){
  const section=createCollectionSectionDraft(kind,'section','item');
  const page={schemaVersion:1,title:'Page',sections:[section]};
  if(kind==='logos'){
   assert.equal(validateComposition(page).valid,false);
   section.data.items[0].image={assetId:'logo',alt:'Organisation name',decorative:false};
  }
  assert.equal(validateComposition(page).valid,true);
  const copy=editComposition(page,{type:'duplicate',id:'section',newId:'copied'});
  copy.sections[1].data.items[0].id='changed';assert.equal(copy.sections[0].data.items[0].id,'item');
 }
});

test('reference section drafts require selected records before structural validation',async()=>{
 const {createReferenceSectionDraft}=await import('../lib/cms/section-drafts.ts');
 const ref={recordId:'00000000-0000-4000-8000-000000000001'};
 for(const kind of ['reusableLeadership','reusableFaq','testimonials','productListing','projects','related']){
  const section=createReferenceSectionDraft(kind,'section');const page={schemaVersion:1,title:'Page',sections:[section]};assert.equal(validateComposition(page).valid,false);
  if(kind==='testimonials'||kind==='reusableFaq'||kind==='reusableLeadership')section.data.records=[ref];else section.data.source.records=[ref];assert.equal(validateComposition(page).valid,true);
 }
});
