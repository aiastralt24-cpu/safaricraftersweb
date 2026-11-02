import test from 'node:test';import assert from 'node:assert/strict';
import {handleProductCategoryRevision} from '../lib/cms/product-category-revision-api.ts';
import {verifiedProductCategoryRevision} from '../lib/cms/product-category-revision.ts';
import {newProductCategory} from '../lib/cms/products.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const query={site:id(1),record:id(2),revision:id(3)},evidence={site:id(1),recordId:id(2),revisionId:id(3),currentRevision:id(4),locale:'en',payload:newProductCategory()};
const request=(params=query,auth='Bearer a.b.c')=>new Request('https://cms.test/api/cms/product-categories/revision?'+new URLSearchParams(params),{headers:{authorization:auth}});
test('category revision HTTP reads preserve the pinned revision rather than replacing it with the latest definitions',async()=>{
 const response=await handleProductCategoryRevision(request(),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'get_product_category_revision');assert.deepEqual(args,{p_site:id(1),p_record:id(2),p_revision:id(3)});return evidence;});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual((await response.json()).category,evidence);
});
test('category revision reads reject missing authorization, ambiguous parameters and unavailable records',async()=>{
 assert.equal((await handleProductCategoryRevision(request(query,''),async()=>assert.fail())).status,401);
 for(const params of [{...query,revision:'bad'},{...query,extra:'ignored'},[['site',id(1)],['site',id(9)],['record',id(2)],['revision',id(3)]]])assert.equal((await handleProductCategoryRevision(request(params),async()=>assert.fail())).status,400);
 assert.equal((await handleProductCategoryRevision(request(),async()=>null)).status,404);
});
test('category evidence cannot substitute another website, record or revision and must contain valid definitions',()=>{
 for(const patch of [{site:id(9)},{recordId:id(9)},{revisionId:id(9)},{currentRevision:null},{payload:{...newProductCategory(),attributeGroups:[{id:'a'}]}},{approval:true}])assert.throws(()=>verifiedProductCategoryRevision({...evidence,...patch},query));
 assert.deepEqual(verifiedProductCategoryRevision(evidence,query),evidence);
});
