import test from 'node:test';
import assert from 'node:assert/strict';
import {newDestination} from '../lib/cms/destinations.ts';
import {destinationContentFields,validateDestinationImportTables,destinationTemplate} from '../lib/cms/destination-import-contract.ts';
const page={recordId:'forest',operation:'create',slug:'forest',title:'Forest',locale:'en'};
const workbook=sheets=>({templateVersion:'1.0',pageType:'destination',sheets:{Pages:[page],...sheets}});
test('destination table contract covers every scalar draft field without flattening collections',()=>{
 const base=newDestination();for(const [key,value]of Object.entries(base))if(typeof value==='string'&&!['slug','title'].includes(key))assert.ok(destinationContentFields[key],key);
 for(const field of ['editorial','fieldIntelligence','seo'])for(const [key,value]of Object.entries(base[field]))if(typeof value==='string')assert.ok(destinationContentFields[`${field}.${key}`]);
 assert.deepEqual(Object.keys(destinationTemplate.sheets),['Pages','Content','Lists','Media','Related','FAQs','Sources','Notes']);
 assert.equal(validateDestinationImportTables(workbook({Content:[{recordId:'forest',field:'intro',value:'A forest introduction.'}]})).valid,true);
});
test('destination tables distinguish hard character limits from editorial word guidance',()=>{
 const result=validateDestinationImportTables(workbook({Content:[{recordId:'forest',field:'country',value:'x'.repeat(201)},{recordId:'forest',field:'intro',value:'word '.repeat(251)}]}));
 assert.ok(result.issues.some(i=>i.row===2&&i.field==='value'&&i.severity==='error'));assert.ok(result.issues.some(i=>i.row===3&&i.severity==='warning'));
 const onlyWarning=validateDestinationImportTables(workbook({Content:[{recordId:'forest',field:'seo.title',value:'x'.repeat(61)}]}));assert.equal(onlyWarning.valid,true);
});
test('destination tables reject unexpected columns, unsupported fields, malformed cells and oversized batches',()=>{
 for(const sheets of [{Unexpected:[]},{Content:[{recordId:'forest',field:'constructor',value:'hidden'}]},{Content:[{recordId:'forest',field:'intro',value:{text:'nested'}}]},{Pages:[{...page,unknown:'do not discard'}]},{Notes:Array.from({length:500},()=>({}))}])assert.equal(validateDestinationImportTables(workbook(sheets)).valid,false);
 const numeric=validateDestinationImportTables(workbook({FAQs:[{recordId:'forest',itemId:'q1',position:1,question:'When?',answer:'Winter.'}]}));assert.equal(numeric.tables.FAQs[0].position,'1');assert.equal(numeric.valid,true);
 assert.equal(validateDestinationImportTables({...workbook({}),pageType:'journey'}).valid,false);
 assert.equal(validateDestinationImportTables({templateVersion:'1.0',pageType:'destination',sheets:JSON.parse('{"__proto__":[] ,"Pages":[]}')}).valid,false);
});
