import test from 'node:test';
import assert from 'node:assert/strict';
import {validateJournalImportTables} from '../lib/cms/journal-import-contract.ts';
import {planJournalImport} from '../lib/cms/journal-import-plan.ts';
import {newJournalArticle} from '../lib/cms/journal.ts';
const uuid='10000000-0000-4000-8000-000000000001',revision='20000000-0000-4000-8000-000000000001';
const page={recordId:'forest',operation:'create',slug:'forest',title:'Forest',locale:'en'};
const table=(sheets={})=>({templateVersion:'1.0',pageType:'journalArticle',sheets:{Pages:[page],...sheets}});
const block=(itemId,kind,position,extra={})=>({recordId:'forest',itemId,kind,position,...extra});
test('journal import preserves ordered structured blocks, list items, images and nested settings',()=>{
 const input=table({Content:[{recordId:'forest',field:'cta.button.newWindow',value:'true'},{recordId:'forest',field:'cta.enabled',value:'false'},{recordId:'forest',field:'seo.following',value:'nofollow'},{recordId:'forest',field:'date',value:'2026-10-22'}],Blocks:[block('p','paragraph',2,{text:'Exact\nparagraph'}),block('h','heading',1,{text:'Heading',level:'h2'}),block('q','quote',3,{text:'Quote',attribution:'Guide'}),block('l','list',4,{ordered:'true'}),block('a','link',5,{label:'Plan',href:'/plan'}),block('i','image',6,{assetId:'forest',alt:'Forest',decorative:'false',credit:'Archive'})],ListItems:[{recordId:'forest',itemId:'two',blockId:'l',position:2,text:'Second'},{recordId:'forest',itemId:'one',blockId:'l',position:1,text:'First'}],Media:[{recordId:'forest',itemId:'cover',position:1,role:'image',assetId:'forest',alt:'Forest',decorative:'false'}],Sources:[{recordId:'forest',itemId:'source',position:1,title:'Source',url:'https://example.test/source',accessedAt:'2026-10-22'}]});
 const before=structuredClone(input),result=planJournalImport(input);assert.equal(result.valid,true,JSON.stringify(result.issues));const value=result.changes[0].payload;
 assert.deepEqual(value.body.map(b=>b.id),['h','p','q','l','a','i']);assert.equal(value.body[1].text,'Exact\nparagraph');assert.deepEqual(value.body[3].items,['First','Second']);assert.equal(value.body[5].image.credit,'Archive');assert.equal(value.cta.enabled,false);assert.equal(value.cta.button.newWindow,true);assert.equal(value.seo.following,'nofollow');assert.deepEqual(input,before);
});
test('journal update keeps omitted collections and requires explicit replacement or clearing',()=>{
 const payload={...newJournalArticle(),slug:'forest',title:'Original',body:[{id:'keep',kind:'paragraph',text:'Keep me'}],gallery:[{assetId:'forest',alt:'Forest',decorative:false}]},existing=[{recordId:uuid,revision,locale:'en',payload}];
 const input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision}],Content:[{recordId:uuid,field:'description',value:'New description'}]});
 const result=planJournalImport(input,existing);assert.equal(result.valid,true);assert.deepEqual(result.changes[0].payload.body,payload.body);assert.deepEqual(result.changes[0].payload.gallery,payload.gallery);assert.equal(payload.title,'Original');
 input.sheets.Blocks=[{...block('new','paragraph',1,{text:'Replacement'}),recordId:uuid}];assert.ok(planJournalImport(input,existing).issues.some(i=>i.code==='replacement_required'));
 input.sheets.Pages[0].replaceCollections='body,gallery';const replaced=planJournalImport(input,existing);assert.equal(replaced.valid,true);assert.deepEqual(replaced.changes[0].payload.gallery,[]);assert.equal(replaced.changes[0].payload.body[0].text,'Replacement');
 delete input.sheets.Blocks;assert.deepEqual(planJournalImport(input,existing).changes[0].payload.body,[]);
});
test('journal import rejects stale updates, URL/language changes, duplicate identities and orphan rows atomically',()=>{
 const base={...newJournalArticle(),slug:'forest'},existing=[{recordId:uuid,revision,locale:'en',payload:base}];
 for(const patch of [{expectedRevision:uuid},{slug:'different'},{locale:'fr'}]){const input=table({Pages:[{...page,recordId:uuid,operation:'update',expectedRevision:revision,...patch}]});const result=planJournalImport(input,existing);assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
 for(const sheets of [{Pages:[page,page]},{Content:[{recordId:'missing',field:'author',value:'Guide'}]},{Pages:Array.from({length:26},(_,i)=>({...page,recordId:`id${i}`,slug:`slug${i}`}))}])assert.equal(planJournalImport(table(sheets)).valid,false);
});
test('journal import rejects unsupported or unused block data, orphan list items, unsafe links and ambiguous booleans',()=>{
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
  {Content:[{recordId:'forest',field:'date',value:'2026-02-30'}]},
  {Blocks:[block('same','paragraph',1,{text:'One'}),block('same','paragraph',2,{text:'Two'})]},
  {Blocks:[block('one','paragraph',1,{text:'One'}),block('two','paragraph',1,{text:'Two'})]},
 ]){const result=planJournalImport(table(sheet));assert.equal(result.valid,false,JSON.stringify(sheet));assert.deepEqual(result.changes,[]);}
});
test('journal import hard limits never truncate text; editorial guidance warns without blocking',()=>{
 const value='word '.repeat(60).trim(),input=table({Content:[{recordId:'forest',field:'description',value}]});const result=planJournalImport(input);assert.equal(result.valid,true);assert.equal(result.changes[0].payload.description,value);assert.ok(result.issues.some(i=>i.code==='editorial_guidance'&&i.severity==='warning'));
 input.sheets.Content[0].value='x'.repeat(2001);assert.equal(planJournalImport(input).valid,false);
 assert.equal(validateJournalImportTables(table({Content:[{}, {recordId:'forest',field:'description',value:'x'.repeat(2001)}]})).issues.find(i=>i.code==='character_limit').row,3);
 for(const sheets of [{Unexpected:[]},{Content:[{recordId:'forest',field:'__proto__',value:'bad'}]},{Blocks:[block('p','paragraph',1,{text:'x',unknown:'do not discard'})]},{Content:[{recordId:'forest',field:'author',value:123}]},{Content:Array(501).fill({})}])assert.equal(validateJournalImportTables(table(sheets)).valid,false);
});

test('structured journal tables preserve ordered rows and empty cells without discarding overflow',()=>{
 const input=table({Blocks:[block('comparison','table',1,{caption:'Routes'})],Tables:[{recordId:'forest',itemId:'h',position:1,blockId:'comparison',role:'header',column1:'Route',column2:'Days'},{recordId:'forest',itemId:'b',position:2,blockId:'comparison',role:'row',column1:'Coast',column2:''},{recordId:'forest',itemId:'a',position:1,blockId:'comparison',role:'row',column1:'Forest',column2:'3'}]});
 const result=planJournalImport(input);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.changes[0].payload.body[0],{id:'comparison',kind:'table',caption:'Routes',headers:['Route','Days'],rows:[['Forest','3'],['Coast','']]});
 for(const modify of [v=>v.sheets.Tables.shift(),v=>v.sheets.Tables.push({...v.sheets.Tables[0],itemId:'other'}),v=>v.sheets.Tables[1].column3='Do not lose',v=>v.sheets.Tables[1].blockId='missing',v=>v.sheets.Tables[1].role='invalid',v=>v.sheets.Tables[1].position=1,v=>v.sheets.Tables[0].column1='',v=>v.sheets.Tables[1].column1='x'.repeat(5001)]){const changed=structuredClone(input);modify(changed);assert.equal(planJournalImport(changed).valid,false);assert.deepEqual(planJournalImport(changed).changes,[]);}
});
