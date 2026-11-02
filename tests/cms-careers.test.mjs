import test from 'node:test';import assert from 'node:assert/strict';
import {careerSchema,newCareer,careerDraftFindings,careerApplicationState,careerSaveCommand,careerPath} from '../lib/cms/careers.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const complete=()=>({...newCareer(),summary:'Help guests plan their journeys.',organization:'Example company',employment:'fullTime',postedOn:'2026-10-30',relationships:{locations:[{recordId:id(1)}],documents:[],pages:[]},application:{mode:'external',label:'Apply for this role',url:'https://jobs.example.test/apply'},body:[{id:'description',kind:'paragraph',text:'Responsibilities and required experience.'}]});
test('career drafts allow incomplete authoring but identify missing publication information',()=>{
 assert.equal(careerSchema.safeParse(newCareer()).success,true);assert.deepEqual(careerDraftFindings(newCareer()).map(f=>f.field),['summary','organization','employment','postedOn','relationships.locations','application','body']);assert.deepEqual(careerDraftFindings(complete()),[]);assert.equal(careerPath('guest-advisor'),'/careers/guest-advisor');assert.equal(careerApplicationState(newCareer(),new Date()),'unavailable');
});
test('career application window compares instants across offsets and closes at the exact deadline',()=>{
 const draft={...complete(),opensAt:'2026-11-01T09:00:00+05:30',closesAt:'2026-11-02T09:00:00+05:30'};
 for(const [now,state]of [['2026-11-01T03:29:59Z','scheduled'],['2026-11-01T03:30:00Z','open'],['2026-11-02T03:29:59Z','open'],['2026-11-02T03:30:00Z','closed']])assert.equal(careerApplicationState(draft,new Date(now)),state);
 assert.equal(careerApplicationState({...draft,status:'paused',statusNote:'On hold'},new Date('2026-11-01T04:00:00Z')),'paused');assert.equal(careerApplicationState({...draft,status:'paused'},new Date('2026-11-03T00:00:00Z')),'closed');assert.equal(careerApplicationState({...draft,status:'closed'},new Date('2026-10-31T00:00:00Z')),'closed');assert.equal(careerApplicationState(complete(),new Date('2026-11-01T00:00:00Z')),'open');assert.equal(careerApplicationState(draft,new Date('invalid')),'unavailable');
 for(const patch of [{opensAt:'2026-11-01T09:00:00'},{closesAt:draft.opensAt},{closesAt:'2026-10-31T09:00:00Z'},{postedOn:'2026-02-30'}])assert.equal(careerSchema.safeParse({...draft,...patch}).success,false);
});
test('onsite, hybrid and remote roles disclose workplace or geographic eligibility',()=>{
 const draft=complete();assert.deepEqual(careerDraftFindings({...draft,workMode:'remote',relationships:{...draft.relationships,locations:[]}}).map(f=>f.field),['remoteRegions']);
 assert.deepEqual(careerDraftFindings({...draft,workMode:'remote',remoteRegions:['Worldwide'],relationships:{...draft.relationships,locations:[]}}),[]);
 assert.deepEqual(careerDraftFindings({...draft,workMode:'hybrid',relationships:{...draft.relationships,locations:[]}}).map(f=>f.field),['relationships.locations','remoteRegions']);
 assert.equal(careerSchema.safeParse({...draft,remoteRegions:['India','india']}).success,false);assert.equal(careerSchema.safeParse({...draft,remoteRegions:['  ']}).success,false);
});
test('application destinations cannot smuggle extra fields or unsafe links and closed jobs can remove the action',()=>{
 const draft=complete();for(const application of [{mode:'external',label:'Apply',url:'javascript:alert(1)'},{mode:'external',label:'Apply',url:'https://user:pass@example.test'},{mode:'external',label:'Apply',url:'https://example.test/ bad'},{mode:'form',label:'Apply',formId:'bad'},{mode:'none',url:'https://example.test'},{mode:'form',label:'Apply',formId:id(2),url:'https://example.test'}])assert.equal(careerSchema.safeParse({...draft,application}).success,false);
 assert.deepEqual(careerDraftFindings({...draft,application:{mode:'form',label:'Apply',formId:id(2)}}),[]);
 assert.deepEqual(careerDraftFindings({...draft,status:'closed',statusNote:'This role is filled.',application:{mode:'none'}}),[]);assert.equal(careerApplicationState({...draft,status:'closed',statusNote:'Filled',application:{mode:'none'}},new Date()),'closed');
 assert.deepEqual(careerDraftFindings({...draft,application:{mode:'external',label:'',url:''}}).map(f=>f.field),['application.label','application.url']);
});
test('salary ranges, duplicate identities and unknown fields are rejected without silently changing values',()=>{
 const draft=complete(),compensation={currency:'INR',minimum:0,maximum:100000,unit:'month'};assert.equal(careerSchema.safeParse({...draft,compensation}).success,true);
 for(const patch of [{compensation:{...compensation,minimum:100001}},{compensation:{...compensation,maximum:Infinity}},{compensation:{...compensation,currency:'inr'}},{relationships:{...draft.relationships,locations:[{recordId:id(1)},{recordId:id(1)}]}},{body:[draft.body[0],draft.body[0]]},{schemaVersion:2},{published:true}])assert.equal(careerSchema.safeParse({...draft,...patch}).success,false);
});
test('career creation and updates require recoverable requests or current revision identity',()=>{
 const command={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newCareer()};assert.equal(careerSaveCommand.safeParse(command).success,true);assert.equal(careerSaveCommand.safeParse({...command,requestKey:undefined}).success,false);assert.equal(careerSaveCommand.safeParse({...command,record:id(3),expectedRevision:id(4)}).success,false);assert.equal(careerSaveCommand.safeParse({...command,record:id(3),expectedRevision:id(4),requestKey:undefined}).success,true);
});
