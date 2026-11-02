import test from 'node:test';import assert from 'node:assert/strict';
import {handleProductLibrary,verifiedProductLibrary} from '../lib/cms/product-library-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
for(const type of ['product','productCategory'])test(`${type} library enforces fixed type, filters, pagination and private access`,async()=>{
 const get=q=>new Request('https://cms.test/api/cms/products?site='+id(1)+q,{headers:{authorization:'Bearer a.b.c'}});
 const response=await handleProductLibrary(get('&owned=mine&search=00123'),type,async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'search_product_library');assert.equal(args.p_type,type);assert.equal(args.p_owned,true);assert.equal(args.p_search,'00123');return {records:[],next:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const q of ['&site='+id(2),'&limit=101','&type=page','&owned=other'])assert.equal((await handleProductLibrary(get(q),type,async()=>assert.fail('Bad filter reached RPC'))).status,400);
 const row={id:id(3),type,title:'Product',path:type==='product'?'/products/example':'/product-categories/example',locale:'en',currentRevision:id(4),reviewStatus:'draft',publishedRevision:null,ownerId:id(5)};
 assert.deepEqual(verifiedProductLibrary({records:[row],next:id(3)},type,1).records,[row]);
 for(const value of [{records:[row,row],next:null},{records:[row],next:id(9)},{records:[{...row,type:'page'}],next:null},{records:[{...row,path:'/private'}],next:null},{records:[],next:id(3)}])assert.throws(()=>verifiedProductLibrary(value,type,1));
 assert.throws(()=>verifiedProductLibrary({records:[row],next:null},type,1,id(3)));
});
