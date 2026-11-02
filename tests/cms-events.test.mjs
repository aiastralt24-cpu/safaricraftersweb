import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSchema,eventTimingSchema,eventSaveCommand,eventDraftFindings,newEvent,eventPath} from '../lib/cms/events.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function ready(){return {...newEvent(),title:'Example workshop',slug:'example-workshop',summary:'Synthetic event example',category:'Workshop',organizer:'Example team',timing:{mode:'timed',start:'2026-11-01T01:30:00-04:00',end:'2026-11-01T01:15:00-05:00'},venue:{name:'Example venue',address:'Example address',city:'Example city',region:'',country:'Example country'},body:[{id:'intro',kind:'paragraph',text:'Synthetic workshop details.'}]};}
test('event drafts remain editable before publication fields are complete',()=>{
 assert.equal(eventSchema.safeParse(newEvent()).success,true);
 assert.ok(eventDraftFindings(newEvent()).some(f=>f.code==='event_start_required'));
 assert.equal(eventDraftFindings(ready()).some(f=>f.severity==='error'),false);
 assert.equal(eventPath(ready().slug),'/events/example-workshop');
});
test('event timing compares instants across offsets and handles inclusive all-day ranges',()=>{
 assert.equal(eventTimingSchema.safeParse(ready().timing).success,true);
 assert.equal(eventTimingSchema.safeParse({mode:'timed',start:'2026-11-01T01:30:00-05:00',end:'2026-11-01T01:45:00-04:00'}).success,false);
 for(const timing of [
  {mode:'timed',start:'2026-10-29T12:00:00',end:'2026-10-29T13:00:00'},
  {mode:'timed',start:'2026-10-29T12:00:00Z',end:'2026-10-29T12:00:00Z'},
  {mode:'allDay',start:'2026-02-29',end:'2026-03-01'},
  {mode:'allDay',start:'2026-10-30',end:'2026-10-29'},
 ])assert.equal(eventTimingSchema.safeParse(timing).success,false,JSON.stringify(timing));
 assert.equal(eventTimingSchema.safeParse({mode:'allDay',start:'2028-02-29',end:'2028-02-29'}).success,true);
});
test('attendance rules require appropriate venue or HTTPS access and retain draft values',()=>{
 const v=ready();v.attendance='online';v.venue=newEvent().venue;
 assert.ok(eventDraftFindings(v).some(f=>f.field==='onlineUrl'));
 v.onlineUrl='https://example.test/event';assert.equal(eventDraftFindings(v).some(f=>f.severity==='error'),false);
 v.attendance='hybrid';assert.ok(eventDraftFindings(v).some(f=>f.field==='venue.name'));
 v.onlineUrl='javascript:alert(1)';assert.equal(eventSchema.safeParse(v).success,false);
});
test('cancelled and postponed events explain status and cannot advertise open registration',()=>{
 for(const status of ['cancelled','postponed']){
  const v={...ready(),status,registration:{enabled:true,label:'Register',href:'/contact'}};
  assert.ok(eventDraftFindings(v).some(f=>f.code==='event_status_note_required'));
  assert.ok(eventDraftFindings(v).some(f=>f.code==='event_registration_closed'));
  v.statusNote='Example status explanation';v.registration.enabled=false;
  assert.equal(eventDraftFindings(v).some(f=>f.severity==='error'),false);
 }
 const v=ready();v.registration={enabled:true,label:'',href:''};assert.ok(eventDraftFindings(v).some(f=>f.code==='event_registration_required'));
});
test('event boundaries reject silent fields, duplicate content, unsafe links and overlong text',()=>{
 assert.equal(eventSchema.safeParse({...ready(),unknown:'discard me'}).success,false);
 assert.equal(eventSchema.safeParse({...ready(),title:'x'.repeat(201)}).success,false);
 const v=ready();v.body.push({...v.body[0]});assert.equal(eventSchema.safeParse(v).success,false);
 const refs=ready();refs.relationships.documents=[{recordId:uuid(1)},{recordId:uuid(1)}];assert.equal(eventSchema.safeParse(refs).success,false);
 const heading=ready();heading.body=[{id:'title',kind:'heading',level:'h2',text:'Heading only'}];assert.ok(eventDraftFindings(heading).some(f=>f.code==='event_body_required'));
});
test('event save intent distinguishes recoverable creation from revision-bound updates',()=>{
 const create={action:'save',site:uuid(1),record:null,expectedRevision:null,requestKey:uuid(2),payload:ready()};
 assert.equal(eventSaveCommand.safeParse(create).success,true);
 assert.equal(eventSaveCommand.safeParse({...create,requestKey:undefined}).success,false);
 const update={...create,record:uuid(3),expectedRevision:uuid(4),requestKey:undefined};
 assert.equal(eventSaveCommand.safeParse(update).success,true);
 assert.equal(eventSaveCommand.safeParse({...update,requestKey:uuid(2)}).success,false);
 assert.equal(eventSaveCommand.safeParse({...update,expectedRevision:null}).success,false);
});
