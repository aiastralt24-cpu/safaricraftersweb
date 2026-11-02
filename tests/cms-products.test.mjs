import test from 'node:test';
import assert from 'node:assert/strict';
import {newProduct,newProductCategory,productSchema,productCategorySchema,productSaveCommand,productCategorySaveCommand,productDraftFindings,productPath} from '../lib/cms/products.ts';
import {productAttributeGroups,productSpecifications,productSpecificationFindings} from '../lib/cms/product-attributes.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const attribute=(patch={})=>({id:'diameter',label:'Diameter',valueType:'number',unit:'mm',allowedValues:[],required:true,allowNotApplicable:false,position:0,filterEligible:true,comparisonEligible:true,regions:[],...patch});
const group=(attributes=[attribute()])=>[{id:'dimensions',title:'Dimensions',position:0,attributes}];
const spec=(value,region=null,attributeId='diameter')=>({attributeId,region,value});
const variant={id:'small',title:'Small',code:'000023',size:'S',colour:'Blue',finish:'Matte',packaging:'One item',specifications:[]};
test('product editorial contracts retain codes, technical content, category pins and commerce mappings',()=>{
 const draft={...newProduct(),title:'Sample',code:'0000123',category:{recordId:id(1),revisionId:id(2)},subcategory:{recordId:id(3),revisionId:id(4)},summary:'Summary',body:[{id:'intro',kind:'paragraph',text:'Detailed information'}],enquiry:{label:'Enquire',href:'/contact'},variants:[variant],commerce:{provider:'shopify',productId:'gid://shopify/Product/123',variants:[{variantKey:'small',variantId:'gid://shopify/ProductVariant/456'}]},relationships:{...newProduct().relationships,replacements:[{recordId:id(5)}]}};
 assert.deepEqual(productSchema.parse(draft),draft);assert.deepEqual(productDraftFindings(draft),[]);assert.equal(productPath(draft.slug),'/products/new-product');assert.equal(productSchema.safeParse(newProduct()).success,true);assert.ok(productDraftFindings(newProduct()).some(f=>f.field==='category'));
 assert.equal(productCategorySchema.parse({...newProductCategory(),attributeGroups:group()}).attributeGroups[0].attributes[0].unit,'mm');
});
test('product drafts cannot smuggle approval, pricing, stock, definitions or unsafe actions',()=>{
 for(const patch of [{approved:true},{price:12},{inventory:3},{category:{recordId:id(1),revisionId:id(2),attributeGroups:group()}},{commerce:{provider:'none',price:12}},{commerce:{provider:'shopify',productId:'gid://shopify/Customer/123',variants:[]}},{enquiry:{label:'Enquire',href:'javascript:alert(1)'}},{videos:[{id:'film',title:'Film',url:'http://example.com/film',transcript:''}]},{code:123},{availability:[{countryCode:'IN',region:'Gujarat'},{countryCode:'IN',region:'gujarat'}]},{subcategory:{recordId:id(1),revisionId:id(2)}},{variants:[variant,variant]}])assert.equal(productSchema.safeParse({...newProduct(),...patch}).success,false,JSON.stringify(patch));
 const commerce={provider:'shopify',productId:'gid://shopify/Product/123',variants:[{variantKey:'missing',variantId:'gid://shopify/ProductVariant/456'}]};assert.equal(productSchema.safeParse({...newProduct(),variants:[variant],commerce}).success,false);
 commerce.variants=[{variantKey:'small',variantId:'gid://shopify/ProductVariant/456'},{variantKey:'large',variantId:'gid://shopify/ProductVariant/456'}];assert.equal(productSchema.safeParse({...newProduct(),variants:[variant,{...variant,id:'large'}],commerce}).success,false);
});
test('category definitions have unique stable identities, meaningful types and deterministic ordering',()=>{
 for(const groups of [group([attribute(),attribute({id:'length'})]),group([attribute(),attribute({position:1})]),group([attribute({valueType:'choice'})]),group([attribute({allowedValues:['one']})]),group([attribute({valueType:'text'})]),group([attribute({valueType:'choice',unit:'',allowedValues:['red','RED']})]),[...group(),...group()],[...group(),{id:'other',title:'Other',position:1,attributes:[attribute()]}],group([attribute({regions:[{countryCode:'IN',region:''},{countryCode:'IN',region:''}]})])])assert.equal(productAttributeGroups.safeParse(groups).success,false,JSON.stringify(groups));
 assert.equal(productAttributeGroups.safeParse(group([attribute(),attribute({id:'length',position:1})])).success,true);
});
test('zero, false, blank, unknown and not applicable survive without coercion or accidental required-field success',()=>{
 for(const value of [{state:'known',value:0},{state:'known',value:false},{state:'blank'},{state:'unknown'},{state:'notApplicable',reason:'Not sold in this format'}])assert.deepEqual(productSpecifications.parse([spec(value)])[0].value,value);
 assert.deepEqual(productSpecificationFindings(group(),[spec({state:'known',value:0})]),[]);
 for(const value of [{state:'blank'},{state:'unknown'}])assert.ok(productSpecificationFindings(group(),[spec(value)]).some(f=>f.message.includes('required')));
 assert.ok(productSpecificationFindings(group(),[spec({state:'notApplicable',reason:'No dimension'})]).length);
 assert.deepEqual(productSpecificationFindings(group([attribute({allowNotApplicable:true})]),[spec({state:'notApplicable',reason:'No dimension'})]),[]);
 assert.ok(productSpecificationFindings(group(),[spec({state:'known',value:'0'})]).some(f=>f.message.includes('never coerced')));
 assert.deepEqual(productSpecificationFindings(group([attribute({valueType:'boolean',unit:''})]),[spec({state:'known',value:false})]),[]);
 for(const value of [{state:'known',value:''},{state:'known',value:NaN},{state:'known',value:Infinity},{state:'unknown',value:0},{state:'notApplicable',reason:''}])assert.equal(productSpecifications.safeParse([spec(value)]).success,false);
});
test('regional required specifications and choices use authoritative definitions and reject orphan or duplicate values',()=>{
 const india={countryCode:'IN',region:'Gujarat'},kenya={countryCode:'KE',region:''},groups=group([attribute({regions:[india,kenya]})]);
 assert.deepEqual(productSpecificationFindings(groups,[spec({state:'known',value:0},india),spec({state:'known',value:2},kenya)]),[]);
 assert.ok(productSpecificationFindings(groups,[spec({state:'known',value:0},india)]).some(f=>f.message.includes('KE:')));
 assert.ok(productSpecificationFindings(groups,[spec({state:'known',value:0})]).some(f=>f.field.endsWith('.region')));
 assert.ok(productSpecificationFindings(group(),[spec({state:'known',value:0},null,'foreign')]).some(f=>f.message.includes('not defined')));
 assert.equal(productSpecifications.safeParse([spec({state:'known',value:0}),spec({state:'unknown'})]).success,false);
 const choices=group([attribute({valueType:'choice',unit:'',allowedValues:['Blue','Green']})]);assert.deepEqual(productSpecificationFindings(choices,[spec({state:'known',value:'Blue'})]),[]);assert.ok(productSpecificationFindings(choices,[spec({state:'known',value:'blue'})]).length);
 assert.deepEqual(productSpecificationFindings(group(),[],false),[]);assert.ok(productSpecificationFindings(group(),[]).length);
});
test('discontinued product details preserve identity and require an explanatory note',()=>{
 const draft={...newProduct(),slug:'original-code',lifecycle:'discontinued'};assert.equal(productPath(draft.slug),'/products/original-code');assert.ok(productDraftFindings(draft).some(f=>f.field==='lifecycleNote'));
 assert.equal(productDraftFindings({...draft,lifecycleNote:'Discontinued; contact us for alternatives.'}).some(f=>f.field==='lifecycleNote'),false);
});
test('product and category saves pin revisions and make creation retries identifiable',()=>{
 for(const [schema,payload] of [[productSaveCommand,newProduct()],[productCategorySaveCommand,newProductCategory()]]){
 const body={action:'save',site:id(1),record:null,expectedRevision:null,payload};assert.equal(schema.safeParse(body).success,false);assert.equal(schema.safeParse({...body,requestKey:id(2)}).success,true);assert.equal(schema.safeParse({...body,record:id(3),expectedRevision:id(4)}).success,true);assert.equal(schema.safeParse({...body,record:id(3),expectedRevision:id(4),requestKey:id(2)}).success,false);
 }
});

test('product specifications validate against exact authorized category revisions and inherited variant requirements',async()=>{
 const {productCategoryFindings}=await import('../lib/cms/product-category-validation.ts');
 const category={site:id(10),locale:'en',recordId:id(1),revisionId:id(2),payload:{...newProductCategory(),attributeGroups:group()}};
 const draft={...newProduct(),category:{recordId:id(1),revisionId:id(2)},specifications:[spec({state:'known',value:0})],variants:[variant]};
 const context={site:id(10),locale:'en',categories:[category]};assert.deepEqual(productCategoryFindings(draft,context),[]);
 for(const patch of [{site:id(11)},{locale:'fr'},{revisionId:id(9)},{recordId:id(9)}])assert.ok(productCategoryFindings(draft,{...context,categories:[{...category,...patch}]}).length);
 assert.ok(productCategoryFindings(draft,{...context,categories:[]}).length);assert.ok(productCategoryFindings(draft,{...context,categories:[category,category]}).length);
 assert.ok(productCategoryFindings({...draft,variants:[{...variant,specifications:[spec({state:'unknown'})]}]},context).some(f=>f.field.startsWith('variants.0')));
 const child={...category,recordId:id(3),revisionId:id(4),payload:{...newProductCategory(),parent:{recordId:id(1)},attributeGroups:group([attribute({id:'length',required:false})])}};
 const nested={...draft,subcategory:{recordId:id(3),revisionId:id(4)}};assert.deepEqual(productCategoryFindings(nested,{...context,categories:[child,category]}),[]);
 assert.ok(productCategoryFindings(nested,{...context,categories:[category,{...child,payload:{...child.payload,parent:{recordId:id(99)}}}]}).some(f=>f.field==='subcategory'));
 assert.ok(productCategoryFindings(nested,{...context,categories:[category,{...child,payload:{...child.payload,attributeGroups:group()}}]}).some(f=>f.message.includes('distinct attribute')));
});
