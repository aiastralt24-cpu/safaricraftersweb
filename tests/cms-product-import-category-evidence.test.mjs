import test from 'node:test';
import assert from 'node:assert/strict';
import {planProductImport} from '../lib/cms/product-import-plan.ts';
import {productImportCategoryIssues} from '../lib/cms/product-import-category-evidence.ts';
import {newProductCategory} from '../lib/cms/products.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
function fixture(){
 const plan=planProductImport({templateVersion:'1.0',pageType:'product',sheets:{Pages:[{recordId:'chair',operation:'create',title:'Chair',slug:'chair',locale:'en'}],Content:[{recordId:'chair',field:'category.recordId',value:record},{recordId:'chair',field:'category.revisionId',value:revision}],Specifications:[{recordId:'chair',itemId:'width',position:'0',attributeId:'width',state:'known',valueType:'number',value:'0',countryCode:'IN',region:'Gujarat'}],Variants:[{recordId:'chair',itemId:'small',position:'0',title:'Small'}]}});
 assert.equal(plan.valid,true,JSON.stringify(plan.issues));
 const category={...newProductCategory(),attributeGroups:[{id:'dimensions',title:'Dimensions',position:0,attributes:[{id:'width',label:'Width',valueType:'number',unit:'mm',allowedValues:[],required:true,allowNotApplicable:false,position:0,filterEligible:true,comparisonEligible:true,regions:[{countryCode:'IN',region:'Gujarat'}]}]}]};
 return {changes:plan.changes,evidence:[{importId:'chair',categories:[{site,locale:'en',recordId:record,revisionId:revision,payload:category}]}]};
}
test('import category evidence verifies pinned definitions and inherited regional variant values',()=>{
 const {changes,evidence}=fixture();assert.deepEqual(productImportCategoryIssues(changes,site,evidence),[]);
 changes[0].payload.variants[0].specifications=[{attributeId:'width',region:{countryCode:'IN',region:'Gujarat'},value:{state:'unknown'}}];assert.ok(productImportCategoryIssues(changes,site,evidence).some(i=>i.field.startsWith('variants.0')));
});
test('stale, cross-site, hidden, duplicate or incompatible definitions cannot validate imported specifications',()=>{
 const edits=[f=>f.evidence[0].categories[0].revisionId=site,f=>f.evidence[0].categories[0].site=record,f=>f.evidence[0].categories[0].locale='fr',f=>f.evidence[0].categories=[],f=>f.evidence.push(structuredClone(f.evidence[0])),f=>f.evidence[0].importId='other',f=>f.evidence[0].categories[0].payload.parent={recordId:site},f=>f.changes[0].payload.specifications[0].value={state:'known',value:'0'},f=>f.changes[0].payload.specifications[0].region=null,f=>f.changes[0].payload.specifications[0].attributeId='invented',f=>f.changes[0].payload.specifications=[]];
 for(const edit of edits){const f=fixture();edit(f);assert.ok(productImportCategoryIssues(f.changes,site,f.evidence).length,edit.toString());}
});
