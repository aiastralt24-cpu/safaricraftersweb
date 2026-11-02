import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptFormEnquiry} from '../lib/cms/enquiry-intake.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const site='00000000-0000-4000-8000-000000000001',formId='00000000-0000-4000-8000-000000000002',revisionId='00000000-0000-4000-8000-000000000003',requestKey='00000000-0000-4000-8000-000000000004';
const form=newForm('name');form.fields.push({id:'consent',type:'consent',label:'Privacy',help:'',required:true,validationMessage:'',purpose:'enquiry',text:'Respond to this enquiry.',textVersion:'privacy-1'});
const body={formId,revisionId,requestKey,answers:{name:' Guest ',consent:true},challengeToken:'challenge',sourcePath:'/contact'};
function adapter(patch={}){return {consumeRate:async()=>({allowed:true,retryAfter:1}),verifyChallenge:async()=>true,read:async()=>({websiteId:site,formId,revisionId,definition:form}),files:async()=>[],persist:async()=>({leadId:requestKey,receivedAt:'2026-10-22T12:00:00Z',replayed:false}),...patch};}
test('intake persists normalized answers and stored consent evidence before success',async()=>{
 let saved;const result=await acceptFormEnquiry(body,site,adapter({persist:async value=>{saved=value;return {leadId:requestKey,receivedAt:'2026-10-22T12:00:00Z',replayed:false};}}));
 assert.equal(result.status,200);assert.equal(saved.answers.name,'Guest');assert.equal(saved.consents[0].textVersion,'privacy-1');assert.deepEqual(saved.attribution,{sourcePath:'/contact'});assert.equal(saved.revision,revisionId);assert.equal(saved.request,requestKey);assert.equal(result.body.message,form.successMessage);
});
test('rate/challenge/identity/validation failures never persist a lead',async()=>{
 const never=async()=>assert.fail('unexpected persistence');
 for(const [patch,status]of [[{consumeRate:async()=>({allowed:false,retryAfter:100})},429],[{verifyChallenge:async()=>false},422],[{read:async()=>null},409],[{read:async()=>({websiteId:formId,formId,revisionId,definition:form})},409]])assert.equal((await acceptFormEnquiry(body,site,adapter({...patch,persist:never}))).status,status);
 assert.equal((await acceptFormEnquiry({...body,answers:{name:'',consent:false}},site,adapter({persist:never}))).status,422);
 for(const patch of [{site:formId},{consents:[]},{website:'bot'},{sourcePath:'//external.test'},{definition:form}])assert.equal((await acceptFormEnquiry({...body,...patch},site,adapter({persist:never}))).status,422);
});
test('uncertain persistence never becomes success and provider details are hidden',async()=>{
 for(const persist of [async()=>null,async()=>({leadId:'invalid'}),async()=>{throw Error('private credentials');}]){const result=await acceptFormEnquiry(body,site,adapter({persist}));assert.equal(result.status,503);assert.equal(JSON.stringify(result).includes('private credentials'),false);}
});

test('expedition intake validates identity-only selections and carries them through challenge and form validation',async()=>{
 const expedition={recordId:requestKey,revisionId,slug:'forest',departureId:'future'};let saved;
 const persist=async input=>{saved=input;return {leadId:requestKey,receivedAt:'2026-10-22T12:00:00Z',replayed:false};};
 assert.equal((await acceptFormEnquiry({...body,expedition},site,adapter({persist}))).status,200);assert.deepEqual(saved.expedition,expedition);assert.deepEqual(saved.attribution,{sourcePath:'/contact'});
 const never=async()=>assert.fail('Unexpected write');
 assert.equal((await acceptFormEnquiry({...body,expedition:{...expedition,title:'Forged'}},site,adapter({persist:never}))).status,422);
 assert.equal((await acceptFormEnquiry({...body,expedition},site,adapter({persist:never,verifyChallenge:async()=>false}))).status,422);
 assert.equal((await acceptFormEnquiry({...body,expedition,answers:{}},site,adapter({persist:never}))).status,422);
});
test('success heading and body come from the server-read revision only after a confirmed save, including replay',async()=>{
 const definition={...form,successHeading:'Your brief has been received.',successMessage:'We will respond with next steps.'};
 for(const replayed of [false,true]){const result=await acceptFormEnquiry(body,site,adapter({read:async()=>({websiteId:site,formId,revisionId,definition}),persist:async()=>({leadId:requestKey,receivedAt:'2026-10-22T12:00:00Z',replayed})}));assert.equal(result.status,200);assert.equal(result.body.heading,definition.successHeading);assert.equal(result.body.message,definition.successMessage);}
 assert.equal((await acceptFormEnquiry(body,site,adapter())).body.heading,undefined);
 assert.equal((await acceptFormEnquiry({...body,heading:'Forged'},site,adapter({persist:async()=>assert.fail('must not save')}))).status,422);
 const failed=await acceptFormEnquiry(body,site,adapter({read:async()=>({websiteId:site,formId,revisionId,definition}),persist:async()=>null}));assert.equal(failed.status,503);assert.equal(failed.body.heading,undefined);
});

test('career intake accepts identity-only context and rejects mixed or client-authored job evidence',async()=>{
 const career={recordId:requestKey,revisionId,slug:'advisor'};let saved;
 const persist=async value=>{saved=value;return {leadId:requestKey,receivedAt:'2026-10-22T12:00:00Z',replayed:false};};
 assert.equal((await acceptFormEnquiry({...body,sourcePath:'/careers/advisor',career},site,adapter({persist}))).status,200);assert.deepEqual(saved.career,career);assert.equal(saved.expedition,undefined);
 const never=async()=>assert.fail('unexpected persistence');for(const patch of [{career:{...career,title:'Forged job'}},{career:{...career,slug:'../admin'}},{career,expedition:{recordId:requestKey,revisionId,slug:'forest',departureId:null}}])assert.equal((await acceptFormEnquiry({...body,...patch},site,adapter({persist:never}))).status,422);
});

test('career paths require matching job selection before challenge or persistence and other forms remain generic',async()=>{
 const career={recordId:requestKey,revisionId,slug:'advisor'},never=adapter({consumeRate:async()=>assert.fail('invalid context must stop before provider work')});
 for(const patch of [{sourcePath:'/careers/advisor'},{sourcePath:'/careers'},{sourcePath:'/careers/'},{career,sourcePath:'/contact'},{career,sourcePath:'/careers/other'},{career,sourcePath:undefined}])assert.equal((await acceptFormEnquiry({...body,...patch},site,never)).status,422);
 assert.equal((await acceptFormEnquiry(body,site,adapter())).status,200);
});
