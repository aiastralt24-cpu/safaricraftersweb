import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProductImportTables,productTemplate} from '../lib/cms/product-import-contract.ts';
import {productImportSpecificationValue as decode} from '../lib/cms/product-import-values.ts';
const input=()=>({templateVersion:'1.0',pageType:'product',sheets:{Pages:[{recordId:'chair',operation:'create',slug:'chair',title:'Chair',locale:'en'}],Content:[{recordId:'chair',field:'code',value:'000123'}]}});
test('product contract covers rich sections, variants and mappings while rejecting unknown authority fields',()=>{
 for(const sheet of ['Blocks','Tables','ListItems','Labels','Media','Videos','Variants','Specifications','Availability','Relationships','CommerceVariants'])assert.ok(productTemplate.sheets[sheet]);
 const data=input();assert.equal(validateProductImportTables(data).valid,true);
 for(const field of ['price','inventory','approved','__proto__.polluted']){const bad=input();bad.sheets.Content[0].field=field;assert.equal(validateProductImportTables(bad).valid,false);}
 data.sheets.Content[0].value=123;assert.equal(validateProductImportTables(data).valid,false);
});
test('product field limits retain row locations and editorial recommendations remain warnings',()=>{
 const data=input();data.sheets.Content=[{}, {recordId:'chair',field:'brand',value:'x'.repeat(201)}];let result=validateProductImportTables(data);assert.equal(result.valid,false);assert.ok(result.issues.some(i=>i.row===3&&i.code==='character_limit'));
 data.sheets.Content=[{recordId:'chair',field:'summary',value:Array(81).fill('word').join(' ')}];result=validateProductImportTables(data);assert.equal(result.valid,true);assert.ok(result.issues.some(i=>i.severity==='warning'));
});
test('typed specification decoder retains zero, false, leading-zero text and explicit empty states',()=>{
 for(const [valueType,value,expected] of [['number','0',0],['number','-1.25',-1.25],['boolean','false',false],['choice','000123','000123'],['text','000123','000123']])assert.deepEqual(decode({state:'known',valueType,value}),{state:'known',value:expected});
 for(const state of ['blank','unknown'])assert.deepEqual(decode({state}),{state});assert.deepEqual(decode({state:'notApplicable',reason:'Not offered'}),{state:'notApplicable',reason:'Not offered'});
 for(const value of ['',' ','01','0x10','Infinity','1e999','9007199254740993','1e-999','1,000'])assert.throws(()=>decode({state:'known',valueType:'number',value}));
 for(const row of [{state:'unknown',value:'0'},{state:'blank',reason:'hidden'},{state:'notApplicable'},{state:'known',valueType:'boolean',value:'False'},{state:'known',valueType:'text',value:'ok',reason:'hidden'}])assert.throws(()=>decode(row));
});
