import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';
import {handleProductCategorySave} from '../lib/cms/product-categories-editor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command=()=>({action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newProductCategory()});
const request=(body,headers={})=>new Request('https://cms.test/api/cms/products',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('product create uses a scoped recovery key and verifies receipts',async()=>{
 const c=command();const response=await handleProductCategorySave(request(c),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'create_draft_once');assert.deepEqual(args,{p_site:c.site,p_type:'productCategory',p_path:'/product-categories/new-category',p_title:c.payload.title,p_payload:c.payload,p_locale:'en',p_request:c.requestKey});return {recordId:id(3),revisionId:id(4)};});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).requestKey,c.requestKey);
 assert.equal((await handleProductCategorySave(request(c),async()=>({unexpected:true}))).status,503);
 for(const [body,headers,status] of [[{...c,payload:{...c.payload,attributeGroups:123}},{},422],[{...c,requestKey:undefined},{},422],[c,{origin:'https://other.test'},403],[c,{authorization:''},401],[c,{'content-type':'product/json'},415]])assert.equal((await handleProductCategorySave(request(body,headers),async()=>assert.fail('Invalid request reached persistence'))).status,status);
});
test('product updates check type, current revision and immutable URL/language before saving',async()=>{
 const c={...command(),record:id(3),expectedRevision:id(4),requestKey:undefined};const stored={id:id(3),type:'productCategory',currentRevision:id(4),path:'/product-categories/new-category',locale:'en'};
 for(const [patch,status] of [[{type:'destination'},404],[{currentRevision:id(8)},409],[{path:'/product-categories/different'},422],[{locale:'fr'},422]])assert.equal((await handleProductCategorySave(request(c),async(_,name)=>{assert.equal(name,'get_editor_record');return {...stored,...patch};})).status,status);
 const calls=[];assert.equal((await handleProductCategorySave(request(c),async(_,name,args)=>{calls.push(name);if(name==='get_editor_record')return stored;assert.equal(args.p_expected,id(4));return {recordId:id(3),revisionId:id(5)};})).status,200);assert.deepEqual(calls,['get_editor_record','save_draft']);
 assert.equal((await handleProductCategorySave(request(c),async(_,name)=>name==='get_editor_record'?stored:{recordId:id(9),revisionId:id(5)})).status,503);
});
test('product cancellation preserves unresolved requests and returns verified creation results',async()=>{
 const c={action:'cancel_create',site:id(1),requestKey:id(2)};
 for(const result of [{status:'cancelled'},{status:'created',result:{recordId:id(3),revisionId:id(4)}}]){const response=await handleProductCategorySave(request(c),async(_,name,args)=>{assert.equal(name,'cancel_draft_creation');assert.equal(args.p_type,'productCategory');return result;});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);}
 assert.equal((await handleProductCategorySave(request(c),async()=>({status:'unknown'}))).status,503);
});
