import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEventImportTables} from '../lib/cms/event-import-contract.ts';
import {planEventImport} from '../lib/cms/event-import-plan.ts';
import {newEvent} from '../lib/cms/events.ts';
const uuid='10000000-0000-4000-8000-000000000001',revision='20000000-0000-4000-8000-000000000001';
const page={recordId:'forest',operation:'create',slug:'forest',title:'Forest',locale:'en'};
const table=(sheets={})=>({templateVersion:'1.0',pageType:'event',sheets:{Pages:[page],...sheets}});
const block=(itemId,kind,position,extra={})=>({recordId:'forest',itemId,kind,position,...extra});
test('event import preserves ordered structured blocks, list items, images and nested settings',()=>{
 const input=table({Content:[{recordId:'forest',field:'status',value:'rescheduled'},{recordId:'forest',field:'venue.city',value:'Nairobi'},{recordId:'forest',field:'seo.following',value:'nofollow'},{recordId:'forest',field:'timing.start',value:'2026-10-22T10:00:00Z'}],Blocks:[block('p','paragraph',2,{text:'Exact\nparagraph'}),block('h','heading',1,{text:'Heading',level:'h2'}),block('q','quote',3,{text:'Quote',attribution:'Guide'}),block('l','list',4,{ordered:'true'}),block('a','link',5,{label:'Plan',href:'/plan'}),block('i','image',6,{assetId:'forest',alt:'Forest',decorative:'false',credit:'Archive'})],ListItems:[{recordId:'forest',itemId:'two',blockId:'l',position:2,text:'Second'},{recordId:'forest',itemId:'one',blockId:'l',position:1,text:'First'}],Media:[{recordId:'forest',itemId:'cover',position:1,role:'image',assetId:'forest',alt:'Forest',decorative:'false'}],Relationships:[{recordId:'forest',itemId:'project',position:1,group:'projects',targetId:uuid}]});
 const before=structuredClone(input),result=planEventImport(input);assert.equal(result.valid,true,JSON.stringify(result.issues));const value=result.changes[0].payload;
 assert.deepEqual(value.body.map(b=>b.id),['h','p','q','l','a','i']);assert.equal(value.body[1].text,'Exact\nparagraph');assert.deepEqual(value.body[3].items,['First','Second']);assert.equal(value.body[5].image.credit,'Archive');assert.equal(value.status,'rescheduled');assert.equal(value.venue.city,'Nairobi');assert.deepEqual(value.relationships.projects,[{recordId:uuid}]);assert.equal(value.seo.following,'nofollow');assert.deepEqual(input,before);
});
test('event update keeps omitted collections and requires explicit replacement or clearing',()=>{
 const payload={...newEvent(),slug:'forest',title:'Original',body:[{id:'keep',kind:'paragraph',text:'Keep me'}],gallery:[{assetId:'forest',alt:'Forest',decorative:false}]},existing=[{recordId:uuid,revision,locale:'en',payload}];
 const input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision}],Content:[{recordId:uuid,field:'summary',value:'New summary'}]});
 const result=planEventImport(input,existing);assert.equal(result.valid,true);assert.deepEqual(result.changes[0].payload.body,payload.body);assert.deepEqual(result.changes[0].payload.gallery,payload.gallery);assert.equal(payload.title,'Original');
 input.sheets.Blocks=[{...block('new','paragraph',1,{text:'Replacement'}),recordId:uuid}];assert.ok(planEventImport(input,existing).issues.some(i=>i.code==='replacement_required'));
 input.sheets.Pages[0].replaceCollections='body,gallery';const replaced=planEventImport(input,existing);assert.equal(replaced.valid,true);assert.deepEqual(replaced.changes[0].payload.gallery,[]);assert.equal(replaced.changes[0].payload.body[0].text,'Replacement');
 delete input.sheets.Blocks;assert.deepEqual(planEventImport(input,existing).changes[0].payload.body,[]);
});
test('event import rejects stale updates, URL/language changes, duplicate identities and orphan rows atomically',()=>{
 const base={...newEvent(),slug:'forest'},existing=[{recordId:uuid,revision,locale:'en',payload:base}];
 for(const patch of [{expectedRevision:uuid},{slug:'different'},{locale:'fr'}]){const input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision,...patch}]});const result=planEventImport(input,existing);assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
 for(const sheets of [{Pages:[page,page]},{Content:[{recordId:'missing',field:'organizer',value:'Guide'}]},{Pages:Array.from({length:26},(_,i)=>({...page,recordId:`id${i}`,slug:`slug${i}`}))}])assert.equal(planEventImport(table(sheets)).valid,false);
});
test('event import rejects unsupported or unused block data, orphan list items, unsafe links and ambiguous booleans',()=>{
 for(const sheet of [
  {Blocks:[block('p','paragraph',1,{text:'Text',href:'/silently-lost'})]},
  {Blocks:[block('v','video',1,{text:'Keep video'})]},
  {Blocks:[block('l','list',1,{ordered:'yes'})]},
  {Blocks:[block('l','list',1,{ordered:'false'})]},
  {Blocks:[block('a','link',1,{label:'Bad',href:'javascript:alert(1)'})]},
  {Blocks:[block('h','heading',1,{level:'h4',text:'Bad'})]},
  {Blocks:[block('i','image',1,{assetId:'image',alt:'Photo',decorative:'yes'})]},
  {ListItems:[{recordId:'forest',itemId:'one',position:1,blockId:'missing',text:'Orphan'}]},
  {Content:[{recordId:'forest',field:'cta.enabled',value:'yes'}]},
  {Content:[{recordId:'forest',field:'timing.start',value:'2026-02-30'}]},
  {Blocks:[block('same','paragraph',1,{text:'One'}),block('same','paragraph',2,{text:'Two'})]},
  {Blocks:[block('one','paragraph',1,{text:'One'}),block('two','paragraph',1,{text:'Two'})]},
 ]){const result=planEventImport(table(sheet));assert.equal(result.valid,false,JSON.stringify(sheet));assert.deepEqual(result.changes,[]);}
});
test('event import hard limits never truncate text; editorial guidance warns without blocking',()=>{
 const value='word '.repeat(90).trim(),input=table({Content:[{recordId:'forest',field:'summary',value}]});const result=planEventImport(input);assert.equal(result.valid,true);assert.equal(result.changes[0].payload.summary,value);assert.ok(result.issues.some(i=>i.code==='editorial_guidance'&&i.severity==='warning'));
 input.sheets.Content[0].value='x'.repeat(2001);assert.equal(planEventImport(input).valid,false);
 assert.equal(validateEventImportTables(table({Content:[{}, {recordId:'forest',field:'summary',value:'x'.repeat(2001)}]})).issues.find(i=>i.code==='character_limit').row,3);
 for(const sheets of [{Unexpected:[]},{Content:[{recordId:'forest',field:'__proto__',value:'bad'}]},{Blocks:[block('p','paragraph',1,{text:'x',unknown:'do not discard'})]},{Content:[{recordId:'forest',field:'organizer',value:123}]},{Content:Array(501).fill({})}])assert.equal(validateEventImportTables(table(sheets)).valid,false);
});

test('structured event tables preserve ordered rows and empty cells without discarding overflow',()=>{
 const input=table({Blocks:[block('comparison','table',1,{caption:'Routes'})],Tables:[{recordId:'forest',itemId:'h',position:1,blockId:'comparison',role:'header',column1:'Route',column2:'Days'},{recordId:'forest',itemId:'b',position:2,blockId:'comparison',role:'row',column1:'Coast',column2:''},{recordId:'forest',itemId:'a',position:1,blockId:'comparison',role:'row',column1:'Forest',column2:'3'}]});
 const result=planEventImport(input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.changes[0].payload.body[0],{id:'comparison',kind:'table',caption:'Routes',headers:['Route','Days'],rows:[['Forest','3'],['Coast','']]});
 for(const modify of [v=>v.sheets.Tables.shift(),v=>v.sheets.Tables.push({...v.sheets.Tables[0],itemId:'other'}),v=>v.sheets.Tables[1].column3='Do not lose',v=>v.sheets.Tables[1].blockId='missing',v=>v.sheets.Tables[1].role='invalid',v=>v.sheets.Tables[1].position=1,v=>v.sheets.Tables[0].column1='',v=>v.sheets.Tables[1].column1='x'.repeat(5001)]){const changed=structuredClone(input);modify(changed);assert.equal(planEventImport(changed).valid,false);assert.deepEqual(planEventImport(changed).changes,[]);}
});

test('event import protects relationship replacement and private notes in partial updates',()=>{
 const payload={...newEvent(),slug:'forest',internalNotes:'Keep private note',relationships:{...newEvent().relationships,pages:[{recordId:uuid}]}},existing=[{recordId:uuid,revision,locale:'en',payload}];
 const input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision}],Content:[{recordId:uuid,field:'summary',value:'New summary'}]});
 assert.deepEqual(planEventImport(input,existing).changes[0].payload.relationships,payload.relationships);assert.equal(planEventImport(input,existing).changes[0].payload.internalNotes,'Keep private note');
 input.sheets.Relationships=[{recordId:uuid,itemId:'new',position:'1',group:'pages',targetId:revision}];assert.equal(planEventImport(input,existing).valid,false);
 input.sheets.Pages[0].replaceCollections='relationships.pages';assert.deepEqual(planEventImport(input,existing).changes[0].payload.relationships.pages,[{recordId:revision}]);
 input.sheets.Relationships[0].group='products';assert.equal(planEventImport(input,existing).valid,false);
});
test('event import preserves exact paragraph formatting and rejects mismatched formatting',()=>{
 const input={...table({Blocks:[block('intro','paragraph','1',{text:'Exact text'})]}),formatting:[{sheet:'Blocks',row:2,field:'text',spans:[{text:'Exact ',bold:true},{text:'text'}]}]};
 const result=planEventImport(input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.changes[0].payload.body[0].spans,input.formatting[0].spans);
 input.formatting[0].spans[0].text='Changed ';assert.equal(planEventImport(input).valid,false);
});

test('event imports parse registration explicitly and preserve offset timing and all-day boundaries',()=>{
 const content=fields=>Object.entries(fields).map(([field,value])=>({recordId:'forest',field,value}));
 const timed={'timing.mode':'timed','timing.start':'2026-11-01T01:30:00-04:00','timing.end':'2026-11-01T01:15:00-05:00','registration.enabled':'true','registration.label':'Register','registration.href':'https://example.test/register'};
 const result=planEventImport(table({Content:content(timed)}));assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes[0].path,'/events/forest');assert.equal(result.changes[0].payload.registration.enabled,true);assert.equal(result.changes[0].payload.timing.end,timed['timing.end']);
 const allDay=planEventImport(table({Content:content({'timing.mode':'allDay','timing.start':'2028-02-29','timing.end':'2028-02-29','registration.enabled':'false'})}));assert.equal(allDay.valid,true);assert.equal(allDay.changes[0].payload.registration.enabled,false);assert.deepEqual(allDay.changes[0].payload.timing,{mode:'allDay',start:'2028-02-29',end:'2028-02-29'});
 for(const fields of [{'registration.enabled':'yes'},{'registration.enabled':''},{'timing.mode':'allDay','timing.start':'2026-02-30'},{'timing.mode':'timed','timing.start':'2026-12-01T12:00:00Z','timing.end':'2026-12-01T11:00:00Z'},{'registration.href':'javascript:alert(1)'},{'venue.address':'x'.repeat(1001)}]){const rejected=planEventImport(table({Content:content(fields)}));assert.equal(rejected.valid,false);assert.deepEqual(rejected.changes,[]);}
});

test('event partial updates retain venue and registration and reject an incompatible timing-mode change',()=>{
 const payload={...newEvent(),slug:'forest',timing:{mode:'timed',start:'2026-12-01T09:00:00Z',end:'2026-12-01T10:00:00Z'},registration:{enabled:true,label:'Register',href:'https://example.test/register'},venue:{name:'Venue',address:'Street',city:'City',region:'Region',country:'Country'}};
 const existing=[{recordId:uuid,revision,locale:'en',payload}],input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision}],Content:[{recordId:uuid,field:'summary',value:'Updated'}]});
 const result=planEventImport(input,existing);assert.equal(result.valid,true);assert.deepEqual(result.changes[0].payload.venue,payload.venue);assert.deepEqual(result.changes[0].payload.registration,payload.registration);
 input.sheets.Content=[{recordId:uuid,field:'timing.mode',value:'allDay'}];assert.equal(planEventImport(input,existing).valid,false);assert.deepEqual(payload.timing,{mode:'timed',start:'2026-12-01T09:00:00Z',end:'2026-12-01T10:00:00Z'});
});
