import test from 'node:test';
import assert from 'node:assert/strict';
import {productImportLinks,verifyProductImportEvidence} from '../lib/cms/product-import-evidence.ts';
import {newProduct,newProductCategory} from '../lib/cms/products.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
function fixture(){
 const image={assetId:'image',alt:'Image',decorative:false};
 const payload={...newProduct(),category:{recordId:record,revisionId:revision},gallery:[image],installation:[{id:'install',kind:'image',image}],seo:{...newProduct().seo,socialImage:image},relationships:{...newProduct().relationships,faqs:[{recordId:site}],relatedProducts:[{recordId:site}]}};
 const changes=[{sourceRow:4,importId:'chair',operation:'create',recordId:null,expectedRevision:null,locale:'en',path:'/products/new-product',payload,replacedCollections:[]}];
 const links=productImportLinks(changes),evidence={assets:links.assets.map(assetId=>({assetId,available:true})),references:links.references.map(ref=>({...ref,available:true,revision,locale:'en'})),categories:links.categories.map(pin=>({...pin,available:true,locale:'en',payload:newProductCategory()}))};
 return {changes,evidence};
}
test('product import evidence derives all assets, typed relationships and exact category revision pins',()=>{
 const {changes,evidence}=fixture();assert.deepEqual(productImportLinks(changes),{assets:['image'],references:[{recordId:site,type:'faq'},{recordId:site,type:'product'}],categories:[{recordId:record,revisionId:revision}]});
 assert.deepEqual(verifyProductImportEvidence(changes,site,evidence).issues,[]);
 const second=structuredClone(changes[0]);second.importId='other';second.payload.category.revisionId=site;
 assert.equal(productImportLinks([...changes,second]).categories.length,2);
});
test('missing, duplicate, substituted and leaked unavailable evidence is rejected before interpretation',()=>{
 const mutations=[e=>e.assets=[],e=>e.assets.push(e.assets[0]),e=>e.references.reverse(),e=>e.references[0].type='document',e=>e.references[0].available=false,e=>e.categories[0].revisionId=site,e=>e.categories[0].available=false,e=>e.categories.push(e.categories[0]),e=>e.untrusted=true];
 for(const mutate of mutations){const {changes,evidence}=fixture();mutate(evidence);assert.equal(verifyProductImportEvidence(changes,site,evidence),null,mutate.toString());}
});
test('unavailable images, private references, wrong languages and hidden categories produce original-row findings',()=>{
 const {changes,evidence}=fixture();evidence.assets[0].available=false;evidence.references[0]={...evidence.references[0],available:false,revision:null,locale:null};evidence.references[1].locale='fr';evidence.categories[0]={...evidence.categories[0],available:false,locale:null,payload:null};
 const checked=verifyProductImportEvidence(changes,site,evidence);assert.ok(checked);assert.ok(checked.issues.length>=4);assert.ok(checked.issues.every(issue=>issue.row===4));
});
