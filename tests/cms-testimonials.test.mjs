import test from 'node:test';
import assert from 'node:assert/strict';
import {newTestimonial,testimonialSchema,testimonialDisplay} from '../lib/cms/testimonials.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const value={...newTestimonial(),name:'Synthetic Guest',quote:'A wonderful journey.',role:'Founder',organization:'Example',city:'Example City',verified:true,consent:{status:'granted',evidence:'Private source reference'}};
test('testimonial schema preserves draft states but requires consent evidence when granted',()=>{
 assert.equal(testimonialSchema.safeParse(value).success,true);
 for(const payload of [{...value,quote:''},{...value,quote:'x'.repeat(10001)},{...value,consent:{status:'granted',evidence:' '}},{...value,unknown:true},{...value,image:{assetId:'image',alt:''}}])assert.equal(testimonialSchema.safeParse(payload).success,false);
 assert.equal(testimonialSchema.safeParse({...value,verified:false,consent:{status:'withdrawn',evidence:''}}).success,true);
});
test('anonymous display strips attribution, image and internal evidence without changing source',()=>{
 const input={...value,anonymous:true,image:{assetId:'portrait',alt:'Guest portrait'}};const before=structuredClone(input);const display=testimonialDisplay(input);
 assert.equal(display.name,'Anonymous guest');assert.equal(display.role,'');assert.equal(display.organization,'');assert.equal(display.city,'');assert.equal(display.image,undefined);assert.equal('consent' in display,false);assert.equal('verified' in display,false);assert.equal(display.quote,value.quote);assert.deepEqual(input,before);
});
test('testimonial editor save validates payload and path before user-authorized persistence',async()=>{
 const site='00000000-0000-4000-8000-000000000001';const command={action:'save',site,record:null,expectedRevision:null,type:'testimonial',path:null,title:value.name,locale:'en',payload:value};
 const request=body=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
 let calls=[];assert.equal((await handleEditorCommand(request(command),async(...args)=>{calls.push(args);return {};})).status,200);assert.equal(calls[0][0],'a.b.c');assert.equal(calls[0][1],'save_draft');
 for(const body of [{...command,path:'/guest'},{...command,payload:{...value,quote:''}}])assert.equal((await handleEditorCommand(request(body),async()=>{throw Error('not reached');})).status,422);
});
