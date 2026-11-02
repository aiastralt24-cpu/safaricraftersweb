import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';import {validateProductCategoryContent} from '../lib/cms/product-category-validation-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newProductCategory(),slug:'sample',summary:'Category description'},input={site:id(1),record:id(2),revision:id(3),type:'productCategory',path:'/product-categories/sample',locale:'en',payload},evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),parent:null,media:[]};
test('category validation requires current evidence, correct identity and a description',()=>{
 assert.equal(validateProductCategoryContent(input,evidence).contentChecksPass,true);
 for(const e of [null,{...evidence,websiteId:id(9)},{...evidence,recordId:id(9)},{...evidence,revisionId:id(9)},{...evidence,media:[{assetId:'extra',available:true}]}])assert.equal(validateProductCategoryContent(input,e).contentChecksPass,false);
 for(const patch of [{type:'product'},{path:'/wrong'},{locale:'fr'},{payload:{...payload,summary:''}},{payload:{...payload,approved:true}}])assert.equal(validateProductCategoryContent({...input,...patch},evidence).contentChecksPass,false);
});
test('child category validation rejects absent unpublished self foreign-language and nested parents',()=>{
 const child={...input,payload:{...payload,parent:{recordId:id(4)}}},parent={recordId:id(4),available:true,published:true,locale:'en',payload:newProductCategory()};
 assert.equal(validateProductCategoryContent(child,{...evidence,parent}).contentChecksPass,true);
 for(const value of [null,{...parent,recordId:id(2)},{...parent,available:false},{...parent,published:false},{...parent,locale:'fr'},{...parent,payload:{...parent.payload,parent:{recordId:id(5)}}}])assert.equal(validateProductCategoryContent(child,{...evidence,parent:value}).contentChecksPass,false);
 assert.equal(validateProductCategoryContent(input,{...evidence,parent}).contentChecksPass,false);
});
test('category definitions cannot collide with inherited attributes and social media must retain approved rights',()=>{
 const attribute={id:'size',label:'Size',valueType:'text',unit:'',allowedValues:[],required:false,allowNotApplicable:false,position:0,filterEligible:false,comparisonEligible:false,regions:[]},groups=[{id:'sizes',title:'Sizes',position:0,attributes:[attribute]}];
 const child={...payload,parent:{recordId:id(4)},attributeGroups:groups};const e={...evidence,parent:{recordId:id(4),available:true,published:true,locale:'en',payload:{...newProductCategory(),attributeGroups:groups}}};assert.ok(validateProductCategoryContent({...input,payload:child},e).findings.some(f=>f.code==='product_category_attribute_collision'));
 const image={...payload,seo:{...payload.seo,socialImage:{assetId:'photo',alt:'Category',decorative:false}}};assert.equal(validateProductCategoryContent({...input,payload:image},{...evidence,media:[{assetId:'photo',available:true}]}).contentChecksPass,true);assert.equal(validateProductCategoryContent({...input,payload:image},{...evidence,media:[{assetId:'photo',available:false}]}).contentChecksPass,false);
});
