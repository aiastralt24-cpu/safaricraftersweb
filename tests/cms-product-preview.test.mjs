import test from 'node:test';import assert from 'node:assert/strict';
import {newProduct,newProductCategory} from '../lib/cms/products.ts';
import {productPreview,specificationDisplay} from '../lib/cms/product-preview.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,scope={site:id(1),locale:'en'};
const definition=(key,type,position)=>({id:key,label:key,valueType:type,unit:type==='number'?'mm':'',allowedValues:[],required:false,allowNotApplicable:true,position,filterEligible:false,comparisonEligible:false,regions:[]});
const category={site:id(1),recordId:id(2),revisionId:id(3),currentRevision:id(4),locale:'en',payload:{...newProductCategory(),title:'Sizes',internalNotes:'PRIVATE CATEGORY NOTE',attributeGroups:[{id:'sizes',title:'Sizes',position:0,attributes:[definition('diameter','number',0),definition('recycled','boolean',1),definition('optional','text',2)]}]}};
const row=(attributeId,value)=>({attributeId,region:null,value});
const draft=()=>({...newProduct(),title:'Sample',code:'000123',category:{recordId:id(2),revisionId:id(3)},internalNotes:'PRIVATE PRODUCT NOTE',commerce:{provider:'shopify',productId:'gid://shopify/Product/999',variants:[]},relationships:{...newProduct().relationships,documents:[{recordId:id(8)}]},specifications:[row('diameter',{state:'known',value:0}),row('recycled',{state:'known',value:false})]});
test('product preview retains visitor content but excludes notes, commerce mappings and related record identities',()=>{
 const preview=productPreview(draft(),[category],scope),serialized=JSON.stringify(preview);assert.equal(preview.code,'000123');assert.equal(preview.specifications[0].display,'0');assert.equal(preview.specifications[1].display,'No');assert.equal(preview.specifications[2].display,'Not entered');assert.equal(preview.categories[0].newerRevisionAvailable,true);assert.deepEqual(preview.relatedCounts,[{kind:'documents',count:1}]);
 for(const privateValue of ['PRIVATE PRODUCT NOTE','PRIVATE CATEGORY NOTE','gid://shopify',id(2),id(3),id(8),'internalNotes','commerce'])assert.equal(serialized.includes(privateValue),false,privateValue);
});
test('product preview distinguishes all specification states and applies variant overrides without losing zero',()=>{
 for(const [value,display] of [[{state:'known',value:0},'0'],[{state:'known',value:false},'No'],[{state:'blank'},'Blank'],[{state:'unknown'},'Unknown'],[{state:'notApplicable',reason:'No dimension'},'Not applicable: No dimension']])assert.equal(specificationDisplay(value),display);
 const d=draft();d.variants=[{id:'small',title:'Small',code:'0002',size:'S',colour:'',finish:'',packaging:'',specifications:[row('recycled',{state:'unknown'})]}];const preview=productPreview(d,[category],scope);assert.equal(preview.variants[0].specifications[0].display,'0');assert.equal(preview.variants[0].specifications[0].inherited,true);assert.equal(preview.variants[0].specifications[1].display,'Unknown');assert.equal(preview.variants[0].specifications[1].inherited,false);
});
test('preview never substitutes unrelated definitions and retains unmatched values when evidence is unavailable',()=>{
 for(const patch of [{site:id(9)},{recordId:id(9)},{revisionId:id(9)},{locale:'fr'}])assert.throws(()=>productPreview(draft(),[{...category,...patch}],scope));assert.throws(()=>productPreview(draft(),[category,category],scope));
 const preview=productPreview(draft(),[],scope);assert.equal(preview.definitionsUnavailable,true);assert.equal(preview.specifications[0].display,'0');assert.equal(preview.specifications[0].label,'Unmatched specification');assert.equal(preview.specifications[0].unresolved,true);
});
