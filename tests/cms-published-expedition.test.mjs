import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {projectPublishedExpedition} from '../lib/cms/published-expedition.ts';
const site=randomUUID(),record=randomUUID(),revision=randomUUID(),person=randomUUID(),form=randomUUID();
const image={assetId:'forest',alt:'Forest',decorative:false};
const payload={...newPhotoExpedition(),slug:'forest',title:'Forest',category:'Photography',skill:'All levels',groupSize:'Six',duration:'Five days',description:'Forest photography',intro:'Explore the forest',mentor:'Editorial mentor',heroTitle:'Into the forest',heroCopy:'Morning light',price:'INR 1,20,000 + tax',image,heroImage:image,specialists:[{recordId:person,role:'mentor'},{recordId:person,role:'guide'}],enquiry:{...newPhotoExpedition().enquiry,form:{recordId:form}},departures:[{id:'later',date:'2028-03-01',status:'Full',availability:'Waitlist only'},{id:'past',date:'2028-02-28',status:'Available',availability:''},{id:'today',date:'2028-02-29',status:'Filling fast',availability:'Ask the team'}]};
const page={websiteId:site,recordId:record,revisionId:revision,type:'photoExpedition',locale:'en',payload};
const refs={specialists:[{websiteId:site,recordId:person,publishedRevisionId:revision,type:'specialist',locale:'en',name:'Published mentor'}],form:{websiteId:site,recordId:form,publishedRevisionId:revision,type:'form',locale:'en'}};
const project=(input=page,references=refs)=>projectPublishedExpedition(input,site,'/photo-expeditions/forest','en',references,'2028-02-29');
test('published expedition preserves editorial facts and resolves both roles against one published specialist',()=>{
 const snapshot=structuredClone(page),result=project();assert.equal(result.content.price,payload.price);assert.equal(result.content.mentor,'Editorial mentor');assert.equal(result.content.programmeStatus,'preview');assert.deepEqual(result.specialists.map(item=>item.role),['mentor','guide']);assert.equal(result.specialists[0].name,'Published mentor');assert.equal(result.form.publishedRevisionId,revision);
 assert.deepEqual(result.upcoming.map(item=>item.id),['today','later']);assert.equal(result.upcoming[1].status,'Full');assert.deepEqual(result.earlier.map(item=>item.id),['past']);assert.equal('form' in result.content.enquiry,false);assert.equal('specialists' in result.content,false);assert.deepEqual(page,snapshot);
});
test('published expedition rejects missing, duplicate, foreign and unexpected references',()=>{
 for(const alter of [r=>{r.specialists=[];},r=>{r.specialists.push(r.specialists[0]);},r=>{r.specialists[0].websiteId=randomUUID();},r=>{r.specialists[0].recordId=randomUUID();},r=>{r.specialists[0].locale='fr';},r=>{r.form.websiteId=randomUUID();},r=>{r.form.recordId=randomUUID();},r=>{r.form.type='specialist';},r=>{delete r.form.publishedRevisionId;}]){const changed=structuredClone(refs);alter(changed);assert.throws(()=>project(page,changed));}
});
test('published expedition rejects incomplete drafts and mismatched route, site, language or date',()=>{
 for(const patch of [{price:''},{heroImage:undefined},{days:[{id:'empty',label:'Day one',title:'',copy:'',stay:''}]},{enquiry:{...payload.enquiry,form:undefined}},{video:{assetId:'film',title:'Film',captionsAssetId:'captions',poster:image,caption:'',transcript:''}},{unknown:'private'}])assert.throws(()=>project({...page,payload:{...payload,...patch}}));
 for(const [website,path,locale,date] of [[randomUUID(),'/photo-expeditions/forest','en','2028-02-29'],[site,'/photo-expeditions/other','en','2028-02-29'],[site,'/photo-expeditions/forest','fr','2028-02-29'],[site,'/photo-expeditions/forest','en','2027-02-29']])assert.throws(()=>projectPublishedExpedition(page,website,path,locale,refs,date));
});
