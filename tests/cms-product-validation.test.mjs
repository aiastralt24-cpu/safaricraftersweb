import test from 'node:test';import assert from 'node:assert/strict';
import {newProduct,newProductCategory} from '../lib/cms/products.ts';import {validateProductContent} from '../lib/cms/product-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newProduct(),slug:'sample',code:'0001',summary:'Description',body:[{id:'intro',kind:'paragraph',text:'Product information'}],category:{recordId:id(4),revisionId:id(5)},enquiry:{label:'Enquire',href:'https://example.test/contact'}};
const input={site:id(1),record:id(2),revision:id(3),type:'product',path:'/products/sample',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),categories:[{recordId:id(4),revisionId:id(5),available:true,published:true,locale:'en',payload:newProductCategory()}],references:[],media:[],links:[],commerce:{provider:'none',verified:true}};
test('product trusted checks require exact current evidence and eligible category revisions',()=>{
 assert.equal(validateProductContent(input,evidence).contentChecksPass,true);
 for(const patch of [{websiteId:id(9)},{recordId:id(9)},{revisionId:id(9)},{categories:[]},{categories:[evidence.categories[0],evidence.categories[0]]},{categories:[{...evidence.categories[0],published:false}]},{categories:[{...evidence.categories[0],locale:'fr'}]},{categories:[{...evidence.categories[0],revisionId:id(9)}]}])assert.equal(validateProductContent(input,{...evidence,...patch}).contentChecksPass,false);
 for(const patch of [{type:'page'},{path:'/wrong'},{locale:'fr'}])assert.equal(validateProductContent({...input,...patch},evidence).contentChecksPass,false);
});
test('product checks require exact media and link evidence and verify numeric specifications without coercion',()=>{
 const draft={...payload,gallery:[{assetId:'photo',alt:'Product',decorative:false}],enquiry:{label:'Ask',href:'/contact'},specifications:[{attributeId:'diameter',region:null,value:{state:'known',value:0}}]};
 const category={...newProductCategory(),attributeGroups:[{id:'sizes',title:'Sizes',position:0,attributes:[{id:'diameter',label:'Diameter',valueType:'number',unit:'mm',allowedValues:[],required:true,allowNotApplicable:false,position:0,filterEligible:false,comparisonEligible:true,regions:[]}]}]};
 const ready={...evidence,categories:[{...evidence.categories[0],payload:category}],media:[{assetId:'photo',available:true}],links:[{href:'/contact',available:true}]};assert.equal(validateProductContent({...input,payload:draft},ready).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[{assetId:'photo',available:false}]},{media:[...ready.media,...ready.media]},{links:[]},{links:[{href:'/contact',available:false}]}])assert.equal(validateProductContent({...input,payload:draft},{...ready,...patch}).contentChecksPass,false);
 assert.equal(validateProductContent({...input,payload:{...draft,specifications:[{attributeId:'diameter',region:null,value:{state:'known',value:'0'}}]}},ready).contentChecksPass,false);
});
test('product relation groups are checked individually and provider/video gaps cannot pass',()=>{
 const d={...payload,relationships:{...payload.relationships,relatedProducts:[{recordId:id(6)}],accessories:[{recordId:id(6)}]}};
 const refs=['relatedProducts','accessories'].map(group=>({group,type:'product',recordId:id(6),available:true,published:true,locale:'en'}));assert.equal(validateProductContent({...input,payload:d},{...evidence,references:refs}).contentChecksPass,true);
 for(const references of [[refs[0],refs[0]],[{...refs[0],published:false},refs[1]],[]])assert.equal(validateProductContent({...input,payload:d},{...evidence,references}).contentChecksPass,false);
 const mapped={...payload,commerce:{provider:'shopify',productId:'gid://shopify/Product/1',variants:[]}};assert.equal(validateProductContent({...input,payload:mapped},{...evidence,commerce:{provider:'shopify',verified:false}}).contentChecksPass,false);
 assert.equal(validateProductContent({...input,payload:{...payload,videos:[{id:'video',title:'Video',url:'https://example.test/video',transcript:''}]}},evidence).contentChecksPass,false);
});
