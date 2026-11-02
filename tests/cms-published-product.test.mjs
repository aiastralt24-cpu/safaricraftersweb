import test from 'node:test';import assert from 'node:assert/strict';
import {newProduct} from '../lib/cms/products.ts';import {projectPublishedProduct} from '../lib/cms/published-product.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),path='/products/example';
const definition=(id,valueType,position,extra={})=>({id,label:id,valueType,position,unit:valueType==='number'?'mm':'',allowedValues:[],required:false,allowNotApplicable:true,filterEligible:false,comparisonEligible:false,regions:[],...extra});
const category={recordId:id(2),revisionId:id(3),title:'Reviewed dimensions',slug:'dimensions',parent:null,attributeGroups:[{id:'dimensions',title:'Dimensions',position:0,attributes:[definition('width','number',0),definition('recycled','boolean',1),definition('optional','text',2)]}]};
const row=(attributeId,value,region=null)=>({attributeId,region,value});
const source={...newProduct(),title:'Example',slug:'example',code:'000123',summary:'Product summary',body:[{id:'intro',kind:'paragraph',text:'Product detail'}],enquiry:{label:'Ask us',href:'https://example.test/contact'},category:{recordId:id(2),revisionId:id(3)},specifications:[row('width',{state:'known',value:0}),row('recycled',{state:'known',value:false})]};
const {internalNotes,commerce,relationships,...payload}=source;
const envelope=()=>({websiteId:site,recordId:id(4),revisionId:id(5),path,type:'product',locale:'en',payload:structuredClone(payload),categories:[structuredClone(category)],related:[],faqs:[]});
const project=value=>projectPublishedProduct(value,path,site);
test('published product preserves zero, false and product codes while hiding definition identities and private fields',()=>{
 const result=project(envelope());assert.equal(result.content.code,'000123');assert.equal(result.content.specifications[0].display,'0');assert.equal(result.content.specifications[1].display,'No');assert.equal(result.content.specifications[2].display,'Not entered');assert.deepEqual(result.categories,[{title:'Reviewed dimensions',href:'/product-categories/dimensions'}]);
 for(const field of ['internalNotes','commerce','relationships','attributeGroups','definitionsUnavailable','newerRevisionAvailable',id(2),id(3)])assert.equal(JSON.stringify(result).includes(field),false,field);
 for(const patch of [{internalNotes:'PRIVATE'},{commerce},{relationships}])assert.throws(()=>project({...envelope(),payload:{...payload,...patch}}));
 const value=envelope();value.categories[0].internalNotes='PRIVATE CATEGORY';assert.throws(()=>project(value));
});
test('public product refuses missing, substituted or colliding category definitions and cross-site identities',()=>{
 for(const patch of [{websiteId:id(8)},{path:'/products/other'},{type:'productCategory'},{locale:'fr'},{categories:[]},{categories:[category,category]}])assert.throws(()=>project({...envelope(),...patch}));
 for(const patch of [{revisionId:id(8)},{recordId:id(8)},{parent:{recordId:id(9)}}])assert.throws(()=>project({...envelope(),categories:[{...category,...patch}]}));
 const value=envelope();value.payload.specifications.push(row('invented',{state:'known',value:10}));assert.throws(()=>project(value));
});
test('public variant specifications inherit base values while preserving explicit unknown and not-applicable states',()=>{
 const value=envelope();value.payload.specifications.push(row('optional',{state:'blank'}));value.payload.variants=[{id:'small',title:'Small',code:'0002',size:'S',colour:'',finish:'',packaging:'',specifications:[row('recycled',{state:'unknown'}),row('optional',{state:'notApplicable',reason:'No finish'})]}];
 const result=project(value);assert.equal(result.content.specifications[2].display,'Blank');assert.equal(result.content.variants[0].specifications[0].display,'0');assert.equal(result.content.variants[0].specifications[0].inherited,true);assert.equal(result.content.variants[0].specifications[1].display,'Unknown');assert.equal(result.content.variants[0].specifications[2].display,'Not applicable: No finish');
 value.categories[0].attributeGroups[0].attributes[1].required=true;assert.throws(()=>project(value));
});
test('public related cards reject private, external, duplicate and self links while allowing distinct relationship groups',()=>{
 const card={group:'accessories',title:'Accessory',href:'/products/accessory'};
 assert.equal(project({...envelope(),related:[card,{...card,group:'compatibleSystems'}]}).related.length,2);
 for(const related of [[card,card],[{...card,href:path}],[{...card,href:'/cms/private'}],[{...card,href:'https://example.test'}],[{...card,group:'documents'}],[{...card,recordId:id(8)}]])assert.throws(()=>project({...envelope(),related}));
 assert.equal(project({...envelope(),related:[{group:'documents',title:'Data sheet',href:`/api/documents/download?record=${id(8)}&revision=${id(9)}`}]}).related.length,1);
 assert.throws(()=>project({...envelope(),faqs:[{question:'Question',answer:[]}]}));assert.throws(()=>project({...envelope(),faqs:[{question:'Question',answer:[],internalNotes:'PRIVATE'}]}));
});
test('public product requires complete editorial content and blocks unsupported video delivery',()=>{
 for(const patch of [{code:''},{summary:''},{body:[]},{enquiry:null},{lifecycle:'discontinued',lifecycleNote:''},{videos:[{id:'clip',title:'Clip',url:'https://example.test/video.mp4',transcript:'Transcript'}]}])assert.throws(()=>project({...envelope(),payload:{...payload,...patch}}));
 assert.equal(project({...envelope(),payload:{...payload,lifecycle:'discontinued',lifecycleNote:'Use the replacement model.'}}).content.lifecycle,'discontinued');
});
test('public parent and child definitions use selected revision order and require a real parent relationship',()=>{
 const value=envelope(),child={recordId:id(6),revisionId:id(7),title:'Finish',slug:'finish',parent:{recordId:id(2)},attributeGroups:[{id:'finish',title:'Finish',position:0,attributes:[definition('finish','choice',0,{allowedValues:['Matte','Gloss']})]}]};value.payload.subcategory={recordId:id(6),revisionId:id(7)};value.payload.specifications.push(row('finish',{state:'known',value:'Matte'}));value.categories=[child,category];
 const result=project(value);assert.deepEqual(result.categories.map(c=>c.title),['Reviewed dimensions','Finish']);assert.equal(result.content.specifications.at(-1).display,'Matte');
 for(const parent of [null,{recordId:id(9)}])assert.throws(()=>project({...value,categories:[category,{...child,parent}]}));
 const collision=structuredClone(child);collision.attributeGroups[0].attributes[0].id='width';assert.throws(()=>project({...value,categories:[category,collision]}));
 value.payload.specifications.at(-1).value.value='Unlisted finish';assert.throws(()=>project(value));
});
test('public regional required specifications must be present with correct types for base and variants',()=>{
 const value=envelope(),region={countryCode:'IN',region:'Gujarat'};value.categories[0].attributeGroups[0].attributes[0].regions=[region];value.categories[0].attributeGroups[0].attributes[0].required=true;value.payload.specifications[0].region=region;
 assert.equal(project(value).content.specifications[0].display,'0');assert.equal(project(value).content.specifications[0].region,'IN:gujarat');
 const wrong=structuredClone(value);wrong.payload.specifications[0].region={countryCode:'IN',region:'Kerala'};assert.throws(()=>project(wrong));
 for(const spec of [{state:'known',value:'0'},{state:'unknown'},{state:'blank'}]){const changed=structuredClone(value);changed.payload.specifications[0].value=spec;assert.throws(()=>project(changed));}
});
