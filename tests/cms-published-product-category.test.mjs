import test from 'node:test';import assert from 'node:assert/strict';
import {newProductCategory} from '../lib/cms/products.ts';
import {projectPublishedProductCategory} from '../lib/cms/published-product-category.ts';
import {publishedProductCategoryMetadata} from '../lib/cms/product-category-route.ts';
const id='11111111-1111-4111-8111-111111111111',draft={...newProductCategory(),slug:'example',summary:'Category description'}, {internalNotes,attributeGroups,parent,...payload}=draft;
const envelope={recordId:id,revisionId:id,type:'productCategory',path:'/product-categories/example',locale:'en',payload,parent:null};
test('category projection rejects private definitions, malformed parents and incomplete identities',()=>{
 assert.equal(projectPublishedProductCategory(envelope,envelope.path).content.summary,draft.summary);
 for(const patch of [{internalNotes:'Private'},{attributeGroups:[]},{parent:null},{summary:' '},{slug:'other'}])assert.throws(()=>projectPublishedProductCategory({...envelope,payload:{...payload,...patch}},envelope.path));
 for(const patch of [{locale:'fr'},{type:'product'},{path:'/product-categories/other'},{parent:{title:'Parent',href:'/cms/private'}},{parent:{title:'Self',href:envelope.path}}])assert.throws(()=>projectPublishedProductCategory({...envelope,...patch},envelope.path));
 assert.equal(projectPublishedProductCategory({...envelope,parent:{title:'Parent',href:'/product-categories/root'}},envelope.path).parent.title,'Parent');
});
test('category metadata preserves editorial search controls and sharing image admission URLs',()=>{
 const profile=projectPublishedProductCategory({...envelope,payload:{...payload,seo:{...payload.seo,title:'Search title',indexing:'noindex',socialImage:{assetId:'category-image',alt:'Category image',decorative:false}}}},envelope.path),meta=publishedProductCategoryMetadata(profile);
 assert.equal(meta.title,'Search title');assert.equal(meta.description,draft.summary);assert.equal(meta.robots.index,false);assert.equal(meta.alternates.canonical,envelope.path);assert.match(meta.openGraph.images[0].url,/category-image/);
});
