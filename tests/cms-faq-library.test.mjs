import test from 'node:test';import assert from 'node:assert/strict';
import {handleFaqLibrary} from '../lib/cms/faq-library-api.ts';import {verifiedFaqLibrary} from '../lib/cms/faq-library.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),row={id:id(2),type:'faq',title:'Faq',path:null,locale:'en',currentRevision:id(3),reviewStatus:'draft',publishedRevision:null,ownerId:id(4)};
const request=query=>new Request(`https://site.test/api/cms/faqs?${query}`,{headers:{Authorization:'Bearer a.b.c'}});
test('faq library sends bounded filters to scoped search and checks pagination',async()=>{
 let args;const response=await handleFaqLibrary(request(`site=${site}&search=client&owned=mine&status=draft&publication=unpublished&limit=1`),async(token,name,input)=>{assert.equal(name,'search_faq_library');args=input;return {records:[row],next:row.id};});assert.equal(response.status,200);assert.deepEqual(args,{p_site:site,p_search:'client',p_owned:true,p_status:'draft',p_publication:'unpublished',p_after:null,p_limit:1});assert.match(response.headers.get('cache-control'),/no-store/);
 for(const value of [{records:[row,row],next:null},{records:[row],next:id(9)},{records:[],next:id(9)},{records:[{...row,payload:{secret:true}}],next:null}])assert.throws(()=>verifiedFaqLibrary(value,1));assert.throws(()=>verifiedFaqLibrary({records:[row],next:null},1,row.id));
});
test('faq library rejects duplicate or invalid filters before dispatch',async()=>{
 for(const extra of [`site=${site}`,'owned=someone','status=deleted','publication=secret','limit=101','after=bad','search='+ 'a'.repeat(121),'actor='+id(8)])assert.equal((await handleFaqLibrary(request(`site=${site}&${extra}`),async()=>assert.fail('Unexpected dispatch'))).status,400);
});
