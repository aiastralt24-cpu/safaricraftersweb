import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';
import {productCategoryImportLinks,verifyProductCategoryImportEvidence} from '../lib/cms/product-category-import-evidence.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const change={importId:'child',recordId:null,locale:'en',payload:{...newProductCategory(),parent:{recordId:id},seo:{...newProductCategory().seo,socialImage:{assetId:'image',alt:'Image',decorative:false}}}};
const evidence={assets:[{assetId:'image',available:true}],references:[{recordId:id,type:'productCategory',available:true,revision,locale:'en',parent:null,attributeGroups:[]}]};
test('category review binds exact scoped parent and image evidence and rejects hidden metadata',()=>{
 assert.deepEqual(productCategoryImportLinks([change]),{assets:['image'],references:[{recordId:id,type:'productCategory'}]});assert.deepEqual(verifyProductCategoryImportEvidence([change],evidence).issues,[]);
 for(const patch of [{references:[]},{assets:[]},{references:[...evidence.references,...evidence.references]},{references:[{...evidence.references[0],revision:null}]},{references:[{...evidence.references[0],available:false,revision:null}]}])assert.equal(verifyProductCategoryImportEvidence([change],{...evidence,...patch}),null);
 for(const patch of [{available:false,revision:null,locale:null,parent:null,attributeGroups:null},{locale:'fr'},{parent:{recordId:revision}}])assert.ok(verifyProductCategoryImportEvidence([change],{...evidence,references:[{...evidence.references[0],...patch}]}).issues.length);
 assert.ok(verifyProductCategoryImportEvidence([change],{...evidence,assets:[{assetId:'image',available:false}]}).issues.length);
});
test('parent definitions and same-batch parent edits cannot collide with child definitions',()=>{
 const groups=[{id:'group',title:'Group',position:0,attributes:[{id:'size',label:'Size',position:0,valueType:'number',unit:'mm',required:false,allowNotApplicable:false,filterEligible:false,comparisonEligible:false,allowedValues:[],regions:[]}]}];
 const child={...change,payload:{...change.payload,attributeGroups:groups}};
 assert.ok(verifyProductCategoryImportEvidence([child],{...evidence,references:[{...evidence.references[0],attributeGroups:groups}]}).issues.length);
 const parent={importId:id,recordId:id,locale:'en',payload:{...newProductCategory(),attributeGroups:groups}};
 assert.ok(verifyProductCategoryImportEvidence([child,parent],evidence).issues.length);
});
