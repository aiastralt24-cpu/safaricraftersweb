import test from 'node:test';
import assert from 'node:assert/strict';
import {planProductImport} from '../lib/cms/product-import-plan.ts';
import {newProduct} from '../lib/cms/products.ts';
const record='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const row=(itemId,position=0)=>({recordId:'chair',itemId,position:String(position)});
function input(){return {templateVersion:'1.0',pageType:'product',sheets:{
 Pages:[{recordId:'chair',operation:'create',slug:'chair',title:'Chair',locale:'en'}],
 Content:[{recordId:'chair',field:'code',value:'000123'},{recordId:'chair',field:'category.recordId',value:record},{recordId:'chair',field:'category.revisionId',value:revision},{recordId:'chair',field:'commerce.provider',value:'shopify'},{recordId:'chair',field:'commerce.productId',value:'gid://shopify/Product/123'}],
 Blocks:[{...row('intro'),section:'body',kind:'paragraph',text:'Exact text'},{...row('intro'),section:'installation',kind:'list',ordered:'false'},{...row('intro'),section:'precautions',kind:'table',caption:'Precautions'},{...row('intro'),section:'warranty',kind:'quote',text:'Warranty',attribution:'Maker'}],
 ListItems:[{...row('step'),section:'installation',blockId:'intro',text:'Install safely'}],
 Tables:[{...row('header'),section:'precautions',blockId:'intro',role:'header',column1:'Notice'},{...row('data'),section:'precautions',blockId:'intro',role:'row',column1:'Keep dry'}],
 Labels:[{...row('benefit'),group:'benefits',text:'Comfort'}],
 Media:[{...row('photo'),role:'gallery',assetId:'chair-image',decorative:'false',alt:'Chair'}],
 Videos:[{...row('video'),title:'Assembly',url:'https://example.com/video',transcript:'Exact transcript'}],
 Variants:[{...row('small'),title:'Small',code:'000001'}],
 Specifications:[{...row('width'),attributeId:'width',state:'known',valueType:'number',value:'0'},{...row('width'),variantId:'small',attributeId:'width',state:'known',valueType:'number',value:'1.5'}],
 Availability:[{...row('india'),countryCode:'IN',region:'Gujarat'}],
 Relationships:[{...row('faq'),group:'faqs',targetId:record}],
 CommerceVariants:[{...row('mapping'),variantId:'small',shopifyVariantId:'gid://shopify/ProductVariant/321'}],
 },formatting:[{sheet:'Blocks',row:2,field:'text',spans:[{text:'Exact text',bold:true}]}]};}
test('full product planner preserves all editorial sections, mappings and typed variant overrides',()=>{
 const data=input(),before=structuredClone(data),plan=planProductImport(data);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(data,before);
 const d=plan.changes[0].payload;assert.equal(d.code,'000123');assert.equal(d.body[0].spans[0].bold,true);assert.deepEqual(d.installation[0].items,['Install safely']);assert.deepEqual(d.precautions[0].rows,[['Keep dry']]);assert.equal(d.warranty[0].attribution,'Maker');assert.equal(d.specifications[0].value.value,0);assert.equal(d.variants[0].specifications[0].value.value,1.5);assert.equal(d.variants[0].code,'000001');assert.equal(d.videos[0].transcript,'Exact transcript');assert.equal(d.gallery[0].assetId,'chair-image');assert.equal(d.commerce.variants[0].variantKey,'small');assert.equal(d.relationships.faqs[0].recordId,record);assert.equal(d.availability[0].region,'Gujarat');assert.deepEqual(d.benefits,['Comfort']);assert.equal(plan.changes[0].path,'/products/chair');
});
test('updates preserve omitted data and require full collection intent; explicit clearing works',()=>{
 const base=planProductImport(input()).changes[0].payload,existing=[{recordId:record,revision,locale:'en',payload:base}];
 const data={templateVersion:'1.0',pageType:'product',sheets:{Pages:[{recordId:record,operation:'update',expectedRevision:revision,slug:'chair',title:'New title',locale:'en'}]}};
 let plan=planProductImport(data,existing);assert.equal(plan.valid,true);assert.deepEqual(plan.changes[0].payload,{...base,title:'New title'});
 data.sheets.Labels=[{recordId:record,itemId:'new',position:'0',group:'benefits',text:'New'}];assert.equal(planProductImport(data,existing).valid,false);
 data.sheets.Pages[0].replaceCollections='benefits,videos,commerce,category';plan=planProductImport(data,existing);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(plan.changes[0].payload.benefits,['New']);assert.deepEqual(plan.changes[0].payload.videos,[]);assert.equal(plan.changes[0].payload.category,null);assert.deepEqual(plan.changes[0].payload.commerce,{provider:'none'});assert.deepEqual(plan.changes[0].payload.variants,base.variants);
 for(const patch of [{expectedRevision:record},{locale:'fr'},{slug:'other'}]){const bad=structuredClone(data);Object.assign(bad.sheets.Pages[0],patch);assert.equal(planProductImport(bad,existing).valid,false);}
});
test('orphan children, invalid section scopes, wrong types, partial pins and hidden fields reject the whole batch',()=>{
 const mutations=[d=>d.sheets.ListItems[0].section='body',d=>d.sheets.Tables[0].section='body',d=>d.sheets.Blocks[0].section='secret',d=>d.sheets.Blocks[0].url='https://example.com',d=>d.sheets.Specifications[1].variantId='missing',d=>d.sheets.Specifications[0].valueType='boolean',d=>d.sheets.Specifications[0].region='Gujarat',d=>d.sheets.CommerceVariants[0].variantId='missing',d=>d.sheets.Content.splice(2,1),d=>d.sheets.Labels[0].group='__proto__',d=>d.sheets.Media[0].decorative='yes',d=>d.sheets.Availability[0].countryCode='in',d=>d.sheets.Relationships[0].targetId='missing',d=>d.sheets.Content.push({recordId:'chair',field:'code',value:'duplicate'}),d=>d.sheets.Variants[0].recordId='orphan',d=>d.sheets.Pages[0].replaceCollections='unknown',d=>d.formatting[0].spans[0].text='Different',d=>d.sheets.Specifications.push({...d.sheets.Specifications[0],itemId:'duplicate',position:'2'})];
 for(const mutate of mutations){const data=input();mutate(data);const plan=planProductImport(data);assert.equal(plan.valid,false,mutate.toString());assert.deepEqual(plan.changes,[]);}
});
test('changes to commerce require explicit replacement and cannot retain unmentioned old mappings',()=>{
 const base=planProductImport(input()).changes[0].payload,existing=[{recordId:record,revision,locale:'en',payload:base}];
 const data={templateVersion:'1.0',pageType:'product',sheets:{Pages:[{recordId:record,operation:'update',expectedRevision:revision,slug:'chair',title:'Chair',locale:'en'}],Content:[{recordId:record,field:'commerce.provider',value:'shopify'},{recordId:record,field:'commerce.productId',value:'gid://shopify/Product/456'}]}};
 assert.equal(planProductImport(data,existing).valid,false);data.sheets.Pages[0].replaceCollections='commerce';const plan=planProductImport(data,existing);assert.equal(plan.valid,true);assert.deepEqual(plan.changes[0].payload.commerce,{provider:'shopify',productId:'gid://shopify/Product/456',variants:[]});
});
test('a bad page makes a multi-product plan atomic and bounded',()=>{
 const data=input();data.sheets.Pages.push({...data.sheets.Pages[0],recordId:'other',slug:'other',title:''});const plan=planProductImport(data);assert.equal(plan.valid,false);assert.deepEqual(plan.changes,[]);
 const many=input();many.sheets.Pages=Array.from({length:26},(_,i)=>({...many.sheets.Pages[0],recordId:'p'+i,slug:'p-'+i}));assert.equal(planProductImport(many).valid,false);
 assert.equal(planProductImport({templateVersion:'1.0',pageType:'product',sheets:{Pages:[{recordId:'minimal',operation:'create',slug:'minimal',title:'Minimal',locale:'en'}]}}).valid,true);
});
