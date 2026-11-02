import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {resolveExpeditionEnquiryContext} from '../lib/cms/expedition-enquiry-context.ts';
const site=randomUUID(),record=randomUUID(),revision=randomUUID(),form=randomUUID(),formRevision=randomUUID();
const base=newPhotoExpedition(),image={assetId:'forest',alt:'Forest',decorative:false};
const payload={...base,slug:'forest',title:'Published forest expedition',category:'Photo',skill:'All',groupSize:'Six',duration:'Five days',description:'Forest',intro:'Explore',mentor:'Mentor',heroTitle:'Forest',heroCopy:'Morning',price:'INR 1,20,000 + tax',image,heroImage:image,enquiry:{...base.enquiry,form:{recordId:form}},departures:[{id:'full',date:'2028-02-29',endDate:'2028-03-03',status:'Full',availability:'Enquire about the waitlist'},{id:'old',date:'2028-02-28',status:'Available',availability:''}]};
const input={page:{websiteId:site,recordId:record,revisionId:revision,type:'photoExpedition',locale:'en',payload},references:{specialists:[],form:{websiteId:site,recordId:form,publishedRevisionId:formRevision,type:'form',locale:'en'}}};
const selection={recordId:record,revisionId:revision,slug:'forest',departureId:'full'};
const resolve=(selected=selection,value=input)=>resolveExpeditionEnquiryContext(selected,value,site,form,formRevision,'2028-02-29');
test('expedition enquiry resolves exact editorial context and keeps Full enquiries distinct from bookings',()=>{
 const before=structuredClone(input),result=resolve();assert.equal(result.title,payload.title);assert.equal(result.price,payload.price);assert.equal(result.programmeStatus,'preview');assert.equal(result.departure.status,'Full');assert.equal(result.departure.availability,'Enquire about the waitlist');assert.equal(result.departure.endDate,'2028-03-03');assert.equal(result.formRevisionId,formRevision);assert.deepEqual(input,before);
 assert.equal(resolve({...selection,departureId:null}).departure,null);
});
test('expedition enquiry rejects forged copy, unknown or past departures and stale revisions',()=>{
 for(const patch of [{title:'Forged'},{price:'Free'},{status:'Available'},{recordId:randomUUID()},{revisionId:randomUUID()},{slug:'other'},{departureId:'unknown'},{departureId:'old'},{departureId:'../secret'}])assert.throws(()=>resolve({...selection,...patch}));
 for(const patch of [{revisionId:randomUUID()},{websiteId:randomUUID()}])assert.throws(()=>resolve(selection,{...input,page:{...input.page,...patch}}));
 assert.throws(()=>resolve(selection,null));
});
test('expedition enquiry refuses a different form or form revision even when the expedition matches',()=>{
 for(const [formId,revisionId] of [[randomUUID(),formRevision],[form,randomUUID()]])assert.throws(()=>resolveExpeditionEnquiryContext(selection,input,site,formId,revisionId,'2028-02-29'));
 const changed=structuredClone(input);changed.references.form.publishedRevisionId=randomUUID();assert.throws(()=>resolve(selection,changed));
 const removed=structuredClone(input);removed.page.payload.departures=[];assert.throws(()=>resolve(selection,removed));
});
