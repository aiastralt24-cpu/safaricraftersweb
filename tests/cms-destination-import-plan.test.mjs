import test from 'node:test';
import assert from 'node:assert/strict';
import {planDestinationImport} from '../lib/cms/destination-import-plan.ts';
import {newDestination} from '../lib/cms/destinations.ts';
const recordId='11111111-1111-4111-8111-111111111111',revision='22222222-2222-4222-8222-222222222222',targetId='33333333-3333-4333-8333-333333333333';
const page={recordId:'forest',operation:'create',slug:'forest',title:'Forest',locale:'en'};
const workbook=(sheets={},p=page)=>({templateVersion:'1.0',pageType:'destination',sheets:{Pages:[p],...sheets}});
const image={assetId:'forest-image',alt:'Forest canopy',decorative:false};
const existing=()=>[{recordId,revision,locale:'en',payload:{...newDestination(),slug:'forest',title:'Original',intro:'Keep this introduction',image,gallery:[image],bestFor:['Birds'],seo:{...newDestination().seo,title:'Keep SEO'},editorial:{...newDestination().editorial,scoop:[{title:'Field note',blurb:'Keep',body:'Keep body'}]}}}];
const update={...page,recordId,operation:'update',expectedRevision:revision};
const ordered=(extra={},identity='forest')=>({recordId:identity,itemId:'first',position:1,...extra});
test('destination import creates full ordered draft snapshots without mutating source tables',()=>{
 const input=workbook({Content:[{recordId:'forest',field:'intro',value:'An introduction'}],Lists:[ordered({position:2,itemId:'second',field:'bestFor',text:'Birds'}),ordered({field:'bestFor',text:'Tigers'})],Media:[ordered({role:'image',...image,decorative:'false'})],Related:[ordered({type:'destination',targetId,title:'Nearby',reason:'Extend the journey'})],FAQs:[ordered({question:'When?',answer:'Winter'})],Sources:[ordered({title:'Research',url:'https://example.com/research',accessedAt:'2026-10-22'})],Notes:[ordered({title:'A note',body:'Field observations'})]});
 const before=structuredClone(input),result=planDestinationImport(input);
 assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(input,before);
 const change=result.changes[0];assert.equal(change.recordId,null);assert.equal(change.path,'/destinations/forest');assert.deepEqual(change.payload.bestFor,['Tigers','Birds']);assert.deepEqual(change.payload.image,image);assert.equal(change.payload.pairings[0].recordId,targetId);assert.equal(change.payload.editorial.scoop[0].body,'Field observations');assert.equal(change.payload.sources[0].publisher,'');
});
test('destination updates preserve omitted scalar, nested and collection content',()=>{
 const stored=existing(),before=structuredClone(stored);const result=planDestinationImport(workbook({Content:[{recordId,field:'description',value:'New description'}]},update),stored);
 assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(stored,before);
 assert.deepEqual(result.changes[0].payload,{...before[0].payload,title:'Forest',description:'New description'});assert.equal(result.changes[0].expectedRevision,revision);
});
test('destination collection replacement and clearing require explicit intent',()=>{
 const rows={Lists:[ordered({field:'bestFor',text:'Photography'},recordId)]};
 assert.ok(planDestinationImport(workbook(rows,update),existing()).issues.some(i=>i.code==='replacement_required'));
 const result=planDestinationImport(workbook(rows,{...update,replaceCollections:'bestFor, gallery, image, editorial.scoop'}),existing());
 assert.equal(result.valid,true,JSON.stringify(result.issues));const draft=result.changes[0].payload;
 assert.deepEqual(draft.bestFor,['Photography']);assert.deepEqual(draft.gallery,[]);assert.deepEqual(draft.editorial.scoop,[]);assert.equal(draft.image,undefined);assert.equal(draft.seo.title,'Keep SEO');
 for(const replaceCollections of ['gallery,gallery','video','__proto__'])assert.equal(planDestinationImport(workbook({},{...update,replaceCollections}),existing()).valid,false);
});
test('destination plans reject stale revisions, route changes and ambiguous existing identities',()=>{
 for(const p of [{...update,expectedRevision:targetId},{...update,slug:'another'},{...update,locale:'fr'},{...update,expectedRevision:''}])assert.equal(planDestinationImport(workbook({},p),existing()).valid,false);
 assert.equal(planDestinationImport(workbook({},update),[...existing(),...existing()]).valid,false);
 assert.equal(planDestinationImport(workbook({},{...page,slug:'india'})).valid,false);
 assert.equal(planDestinationImport(workbook({},{...page,expectedRevision:revision})).valid,false);
});
test('destination plans reject malformed relationships, duplicate ordering and orphan rows atomically',()=>{
 const cases=[{Related:[ordered({type:'journey',targetId:'not-a-uuid'})]},{FAQs:[ordered({question:'When?',answer:'Winter'}),ordered({itemId:'second',question:'Where?',answer:'Forest'})]},{Media:[ordered({role:'image',...image,decorative:'yes'})]},{Media:[ordered({role:'image',...image,decorative:'false'}),ordered({itemId:'second',position:2,role:'image',...image,decorative:'false'})]},{Content:[{recordId:'missing',field:'intro',value:'Orphan'}]},{Content:[{recordId:'forest',field:'intro',value:'One'},{recordId:'forest',field:'intro',value:'Two'}]}];
 for(const sheets of cases){const result=planDestinationImport(workbook({...sheets,Pages:[page,{...page,recordId:'other',slug:'other'}]}));assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
});
