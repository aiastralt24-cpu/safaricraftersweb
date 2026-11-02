import test from 'node:test';
import assert from 'node:assert/strict';
import {newLocation,locationSchema,locationDraftFindings,locationSaveCommand,locationPath} from '../lib/cms/locations.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const complete=()=>({...newLocation(),summary:'Example office',address:{lines:['Example premises'],locality:'Example city',region:'',postalCode:'',countryCode:'IN'},visiting:'noPublicAccess'});
test('business location drafts allow unfinished content but identify publication omissions',()=>{
 assert.equal(locationSchema.safeParse(newLocation()).success,true);
 assert.deepEqual(locationDraftFindings(newLocation()).map(f=>f.field),['summary','address.lines','address.locality','address.countryCode','visiting']);
 assert.deepEqual(locationDraftFindings(complete()),[]);
 assert.equal(locationPath('example-office'),'/locations/example-office');
 const appointment={...complete(),visiting:'appointmentOnly'};
 assert.deepEqual(locationDraftFindings(appointment).map(f=>f.field),['contact']);
 assert.deepEqual(locationDraftFindings({...appointment,contact:{...appointment.contact,email:'example@example.org'}}),[]);
});
test('location hours retain local time, split overnight periods and reject ambiguity',()=>{
 const base={...complete(),timeZone:'Asia/Kolkata',hours:[{day:1,intervals:[{opens:'09:00',closes:'12:00'},{opens:'13:00',closes:'18:00'}]}]};
 assert.deepEqual(locationDraftFindings(base),[]);
 assert.deepEqual(locationDraftFindings({...base,timeZone:''}).map(f=>f.field),['timeZone']);
 for(const hours of [[{day:1,intervals:[{opens:'22:00',closes:'02:00'}]}],[{day:1,intervals:[{opens:'09:00',closes:'12:00'},{opens:'11:00',closes:'13:00'}]}],[base.hours[0],base.hours[0]],[{day:0,intervals:[]}],[{day:1,intervals:[{opens:'24:00',closes:'24:00'}]}]])assert.equal(locationSchema.safeParse({...base,hours}).success,false);
 assert.equal(locationSchema.safeParse({...base,hours:[{day:1,intervals:[{opens:'22:00',closes:'24:00'}]},{day:2,intervals:[{opens:'00:00',closes:'02:00'}]}]}).success,true);
 assert.equal(locationSchema.safeParse({...base,timeZone:'Invalid/Place'}).success,false);
});
test('location coordinates, contact fields and related records are bounded and typed',()=>{
 const base=complete();
 assert.equal(locationSchema.safeParse({...base,coordinates:{latitude:0,longitude:0}}).success,true);
 for(const patch of [{coordinates:{latitude:91,longitude:0}},{coordinates:{latitude:0}},{contact:{...base.contact,website:'javascript:alert(1)'}},{contact:{...base.contact,website:'https://user:password@example.org'}},{contact:{...base.contact,email:'invalid'}},{relationships:{...base.relationships,documents:[{recordId:id(1)},{recordId:id(1)}]}},{body:[{id:'same',kind:'paragraph',text:'A'},{id:'same',kind:'paragraph',text:'B'}]},{unexpected:true}])assert.equal(locationSchema.safeParse({...base,...patch}).success,false);
});
test('location creation and updates require recoverable or revision-bound identity',()=>{
 const base={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newLocation()};
 assert.equal(locationSaveCommand.safeParse(base).success,true);
 assert.equal(locationSaveCommand.safeParse({...base,requestKey:undefined}).success,false);
 assert.equal(locationSaveCommand.safeParse({...base,record:id(3),expectedRevision:id(4)}).success,false);
 assert.equal(locationSaveCommand.safeParse({...base,record:id(3),expectedRevision:id(4),requestKey:undefined}).success,true);
 assert.equal(locationSaveCommand.safeParse({...base,record:id(3),requestKey:undefined}).success,false);
});
