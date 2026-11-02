import test from 'node:test';import assert from 'node:assert/strict';
import {validateStoredContent} from '../lib/cms/content-validation.ts';import {newTestimonial} from '../lib/cms/testimonials.ts';
const valid=()=>({type:'testimonial',path:null,locale:'en',payload:{...newTestimonial(),name:'Guest',quote:'A wonderful trip.',verified:true,consent:{status:'granted',evidence:'PRIVATE_SOURCE'}}});
test('testimonial publication requires verified wording, granted consent and supported identity',()=>{
 const record=valid();assert.equal(validateStoredContent(record).contentChecksPass,true);assert.equal(validateStoredContent(record).validatorVersion,'testimonial-1');
 for(const change of [{verified:false},{name:'   '},{consent:{status:'pending',evidence:'PRIVATE_SOURCE'}},{consent:{status:'withdrawn',evidence:'PRIVATE_SOURCE'}},{consent:{status:'granted',evidence:' '}}]){
  const result=validateStoredContent({...record,payload:{...record.payload,...change}});assert.equal(result.contentChecksPass,false);assert.equal(JSON.stringify(result).includes('PRIVATE_SOURCE'),false);
 }
 assert.equal(validateStoredContent({...record,path:'/reviews/guest'}).contentChecksPass,false);assert.equal(validateStoredContent({...record,locale:'fr'}).contentChecksPass,false);
});
test('optional testimonial portraits require exact eligible media evidence even for anonymous reviews',()=>{
 const record=valid();record.payload={...record.payload,anonymous:true,image:{assetId:'portrait',alt:'Guest',decorative:false}};
 for(const evidence of [undefined,[],[{assetId:'portrait',available:false}],[{assetId:'portrait',available:true},{assetId:'portrait',available:true}]])assert.equal(validateStoredContent(record,evidence).contentChecksPass,false);
 assert.equal(validateStoredContent(record,[{assetId:'portrait',available:true}]).contentChecksPass,true);
});
