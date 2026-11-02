import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const good={type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest journey',description:'A journey through the forest.',intro:'Walk through the forest with an expert guide.',region:'India',duration:'5 days',bestMonths:'November'}};
test('full revision validation retains advisory length guidance without rewriting text',()=>{
 const before=structuredClone(good),result=validateStoredContent(good);
 assert.equal(result.contentChecksPass,true);assert.ok(result.findings.some(f=>f.code==='length_guidance'));assert.deepEqual(good,before);
});
test('cleared required fields cannot use import update semantics to pass',()=>{
 const result=validateStoredContent({...good,payload:{...good.payload,intro:''}});
 assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.field==='intro'&&f.code==='required'));
});
test('URL mismatch, unknown structures, markup and hard button limits fail',()=>{
 for(const change of [{slug:'other'},{sections:[]},{title:'<script>alert(1)</script>'},{buttonLabel:'x'.repeat(31)}])assert.equal(validateStoredContent({...good,payload:{...good.payload,...change}}).contentChecksPass,false);
 assert.equal(validateStoredContent({...good,type:'settings'}).contentChecksPass,false);
});
test('all stored children are checked, including duplicate positions and malformed objects',()=>{
 const item={itemId:'one',position:'1',question:'When?',answer:'In November.'};
 for(const faqs of [[item,{...item,itemId:'two'}],[null],[{}],{},[{...item,answer:''}]])assert.equal(validateStoredContent({...good,payload:{...good.payload,faqs}}).contentChecksPass,false);
});
test('asset IDs alone never establish ownership, availability or rights',()=>{
 const media=[{itemId:'hero',position:1,role:'hero',assetId:'asset',alt:'Forest view'}];
 const result=validateStoredContent({...good,payload:{...good.payload,media}});
 assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='asset_verification_required'));
});
test('site-scoped media evidence must cover every referenced image',()=>{
 const media=[{itemId:'hero',position:1,role:'hero',assetId:'asset',alt:'Forest view'}];
 const record={...good,payload:{...good.payload,media}};
 assert.equal(validateStoredContent(record,[{assetId:'other',available:true}]).contentChecksPass,false);
 assert.equal(validateStoredContent(record,[{assetId:'asset',available:false}]).contentChecksPass,false);
 assert.equal(validateStoredContent(record,[{assetId:'asset',available:true}]).contentChecksPass,true);
});

test('composed page advisory checks inspect nested media and cannot authorize publication',()=>{
 const record={type:'page',path:'/concept',payload:{composition:{schemaVersion:1,title:'About',sections:[{id:'hero',kind:'hero',controls:{label:'Hero'},data:{title:'Forest',copy:'',desktop:{assetId:'forest',alt:'Forest canopy'},buttons:[]}}]}}};
 const missing=validateStoredContent(record,[]);assert.ok(missing.findings.some(f=>f.field==='composition.sections.0.data.desktop.assetId'&&f.code==='asset_verification_required'));
 const checked=validateStoredContent(record,[{assetId:'forest',available:true}]);assert.equal(checked.contentChecksPass,false);assert.deepEqual(checked.findings.map(f=>f.code),['concept_page_structure','concept_menu_required']);
 const invalid=structuredClone(record);invalid.payload.composition.sections[0].data.desktop.alt='';assert.ok(validateStoredContent(invalid,[{assetId:'forest',available:true}]).findings.some(f=>f.code==='composition_field'));
});
test('homepage validation reports desktop/mobile video evidence separately and never authorizes release',()=>{
 const record={type:'homepage',path:'/',payload:{composition:{sections:[]},background:{desktopAssetId:'desktop',mobileAssetId:'mobile'}}};
 for(const evidence of [undefined,[],[{assetId:'desktop',available:false},{assetId:'mobile',available:false}]]){
  const result=validateStoredContent(record,evidence);assert.equal(result.findings.filter(f=>f.code==='video_verification_required').length,2);assert.equal(result.contentChecksPass,false);
 }
 const good=validateStoredContent(record,[{assetId:'desktop',available:true},{assetId:'mobile',available:true}]);assert.equal(good.findings.some(f=>f.code==='video_verification_required'),false);assert.equal(good.contentChecksPass,false);assert.equal(good.validatorVersion,'homepage-1');assert.ok(good.findings.some(f=>f.code==='composition_field'));
 const duplicate=validateStoredContent(record,[{assetId:'desktop',available:true},{assetId:'desktop',available:true},{assetId:'mobile',available:true}]);assert.equal(duplicate.findings.filter(f=>f.code==='video_verification_required').length,1);
});

test('Concept video validation is route and language scoped and requires unique current evidence',()=>{
 const record={type:'page',path:'/concept',locale:'en',payload:{composition:{sections:[]},background:{desktopAssetId:'desktop',mobileAssetId:'mobile'}}};
 const evidence=[{assetId:'desktop',available:true},{assetId:'mobile',available:true}];
 const videoErrors=(value,status=evidence)=>validateStoredContent(value,status).findings.filter(f=>f.code==='video_verification_required');
 assert.deepEqual(videoErrors(record),[]);
 assert.equal(validateStoredContent(record,evidence).contentChecksPass,false);
 assert.ok(validateStoredContent(record,evidence).findings.some(f=>f.code==='concept_page_structure'));
 for(const path of ['/about','/contact','/concept/','/custom'])assert.equal(videoErrors({...record,path}).length,2);
 for(const locale of ['fr',undefined])assert.equal(videoErrors({...record,locale}).length,2);
 for(const status of [[],evidence.map(x=>({...x,available:false})),[...evidence,...evidence]])assert.equal(videoErrors(record,status).length,2);
});
